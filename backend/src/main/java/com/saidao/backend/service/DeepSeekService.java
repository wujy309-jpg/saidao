package com.saidao.backend.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saidao.backend.billing.BillingContext;
import com.saidao.backend.billing.LlmResult;
import com.saidao.backend.config.DeepSeekConfig;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.function.Consumer;

/**
 * DeepSeek 大模型服务（竞赛推荐与 AI 助手使用）。
 *
 * <p>与 v1 的差别：所有调用都返回 {@link LlmResult}，把「是否降级」「真实 token 用量」「耗时」
 * 带回计费层；上游的 usage（含流式的 stream_options.include_usage）不再被丢弃。
 * 同时复用了单例 HttpClient / ObjectMapper（原先每次调用都新建，流式场景重复付 TLS 握手成本）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeepSeekService {

    private final DeepSeekConfig config;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    /** 复用连接池：原先每次调用 new HttpClient()，流式场景握手开销重复付出 */
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    /* ==================== 兼容旧调用方的字符串接口 ==================== */

    /**
     * 通用对话（兼容旧签名）。失败/降级返回 null，由调用方兜底；降级事实已记入计费上下文。
     */
    public String chat(String systemPrompt, String userMessage) {
        LlmResult result = chatResult(systemPrompt, userMessage);
        return result.hasContent() ? result.content() : null;
    }

    /**
     * 流式对话（兼容旧签名）：逐段回调 delta，返回完整回复；失败/降级返回 null。
     */
    public String chatStream(String systemPrompt, List<Message> messages, int maxTokens,
                             Consumer<String> onDelta) {
        LlmResult result = chatStreamResult(systemPrompt, messages, maxTokens, onDelta);
        return result.hasContent() ? result.content() : null;
    }

    /* ==================== 结构化接口（计费层使用） ==================== */

    /** 通用对话：带 usage / 耗时 / 降级标记 */
    public LlmResult chatResult(String systemPrompt, String userMessage) {
        if (!isApiEnabled()) {
            log.warn("DeepSeek API 未启用或未配置 API Key");
            return record(LlmResult.degraded("API_KEY_MISSING"));
        }
        long start = System.currentTimeMillis();
        try {
            List<Message> messages = List.of(
                    new Message("system", systemPrompt),
                    new Message("user", userMessage)
            );
            DeepSeekResponse response = callApi(messages);
            long latency = System.currentTimeMillis() - start;
            if (response == null) {
                return record(new LlmResult(null, true, "EMPTY_RESPONSE", 0, 0, latency, null, config.getModel()));
            }
            String content = null;
            String finishReason = null;
            if (response.getChoices() != null && !response.getChoices().isEmpty()) {
                Choice first = response.getChoices().get(0);
                if (first.getMessage() != null) content = first.getMessage().getContent();
                finishReason = first.getFinishReason();
            }
            long promptTokens = response.getUsage() == null ? 0 : response.getUsage().getPromptTokens();
            long completionTokens = response.getUsage() == null ? 0 : response.getUsage().getCompletionTokens();
            String model = response.getModel() == null ? config.getModel() : response.getModel();
            LlmResult result = new LlmResult(content, content == null || content.isBlank(), null,
                    promptTokens, completionTokens, latency, finishReason, model);
            return record(result.asDegradedIfEmpty("EMPTY_CONTENT"));
        } catch (Exception e) {
            log.error("DeepSeek API调用失败", e);
            return record(new LlmResult(null, true, errorType(e), 0, 0,
                    System.currentTimeMillis() - start, null, config.getModel()));
        }
    }

    /** 流式对话：带 usage / 耗时 / 降级标记（流式也采集 usage） */
    public LlmResult chatStreamResult(String systemPrompt, List<Message> messages, int maxTokens,
                                      Consumer<String> onDelta) {
        if (!isApiEnabled()) {
            log.warn("DeepSeek API 未启用或未配置 API Key,助手将使用降级回复");
            return record(LlmResult.degraded("API_KEY_MISSING"));
        }
        long start = System.currentTimeMillis();
        try {
            List<Message> all = new java.util.ArrayList<>();
            all.add(new Message("system", systemPrompt));
            all.addAll(messages);

            java.util.Map<String, Object> bodyMap = new java.util.HashMap<>();
            bodyMap.put("model", config.getModel());
            bodyMap.put("messages", all.stream()
                    .map(m -> java.util.Map.of("role", m.getRole(), "content", m.getContent())).toList());
            bodyMap.put("stream", true);
            bodyMap.put("max_tokens", maxTokens);
            bodyMap.put("temperature", config.getTemperature());
            // 关键：不加这一项，流式响应里根本没有 usage，平台就永远不知道真实消耗
            bodyMap.put("stream_options", java.util.Map.of("include_usage", true));
            if (config.getReasoningEffort() != null && !config.getReasoningEffort().isBlank()) {
                bodyMap.put("reasoning_effort", config.getReasoningEffort());
            }
            String body = objectMapper.writeValueAsString(bodyMap);

            HttpRequest request = HttpRequest.newBuilder(
                            URI.create(config.getBaseUrl() + "/v1/chat/completions"))
                    .timeout(Duration.ofMinutes(5))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + config.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<InputStream> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (resp.statusCode() != 200) {
                log.error("DeepSeek 流式调用失败: HTTP {}", resp.statusCode());
                drain(resp.body());
                return record(new LlmResult(null, true, "HTTP_" + resp.statusCode(), 0, 0,
                        System.currentTimeMillis() - start, null, config.getModel()));
            }

            StringBuilder full = new StringBuilder();
            long promptTokens = 0;
            long completionTokens = 0;
            String finishReason = null;
            String model = config.getModel();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resp.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data:")) continue;
                    String payload = line.substring(5).trim();
                    if ("[DONE]".equals(payload)) break;
                    try {
                        JsonNode node = objectMapper.readTree(payload);
                        if (node.hasNonNull("model")) model = node.get("model").asText();
                        JsonNode usage = node.path("usage");
                        if (!usage.isMissingNode() && !usage.isNull()) {
                            promptTokens = usage.path("prompt_tokens").asLong(promptTokens);
                            completionTokens = usage.path("completion_tokens").asLong(completionTokens);
                        }
                        JsonNode choice = node.path("choices").path(0);
                        if (choice.hasNonNull("finish_reason")) {
                            finishReason = choice.get("finish_reason").asText();
                        }
                        JsonNode delta = choice.path("delta").path("content");
                        if (delta.isTextual() && !delta.asText().isEmpty()) {
                            String t = delta.asText();
                            full.append(t);
                            if (onDelta != null) onDelta.accept(t);
                        }
                    } catch (Exception ignore) {
                        // 忽略无法解析的行
                    }
                }
            }
            long latency = System.currentTimeMillis() - start;
            LlmResult result = new LlmResult(full.toString(), full.isEmpty(), null,
                    promptTokens, completionTokens, latency, finishReason, model);
            return record(result.asDegradedIfEmpty("EMPTY_CONTENT"));
        } catch (Exception e) {
            log.error("DeepSeek 流式调用失败", e);
            return record(new LlmResult(null, true, errorType(e), 0, 0,
                    System.currentTimeMillis() - start, null, config.getModel()));
        }
    }

    /* ==================== 内部 ==================== */

    /** 把这次调用的用量同步给计费上下文（不在计费流程内时静默忽略） */
    private LlmResult record(LlmResult result) {
        BillingContext.recordLlm(result.model(), result.promptTokens(), result.completionTokens(),
                result.latencyMs(), result.degraded(), result.errorType());
        return result;
    }

    private String errorType(Exception e) {
        if (e instanceof java.util.concurrent.TimeoutException) return "TIMEOUT";
        String name = e.getClass().getSimpleName();
        return name == null || name.isBlank() ? "UNKNOWN" : name;
    }

    /** 上游非 200 时把响应体读掉，避免连接泄漏 */
    private void drain(InputStream body) {
        try (InputStream in = body) {
            in.readAllBytes();
        } catch (Exception ignored) {
        }
    }

    private boolean isApiEnabled() {
        return config.isEnabled() && config.getApiKey() != null && !config.getApiKey().isEmpty();
    }

    private DeepSeekResponse callApi(List<Message> messages) {
        WebClient webClient = webClientBuilder.baseUrl(config.getBaseUrl()).build();

        DeepSeekRequest request = new DeepSeekRequest();
        request.setModel(config.getModel());
        request.setMaxTokens(config.getMaxTokens());
        request.setTemperature(config.getTemperature());
        request.setReasoningEffort(config.getReasoningEffort());
        request.setStream(false);
        request.setMessages(messages);

        return webClient.post()
                .uri("/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + config.getApiKey())
                .bodyValue(request)
                .retrieve()
                .bodyToMono(DeepSeekResponse.class)
                .block();
    }

    @Data
    private static class DeepSeekRequest {
        private String model;
        private List<Message> messages;
        @JsonProperty("max_tokens")
        private int maxTokens;
        private double temperature;
        @JsonProperty("reasoning_effort")
        private String reasoningEffort;
        private boolean stream;
    }

    @Data
    public static class Message {
        private String role;
        private String content;

        public Message(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }

    @Data
    private static class DeepSeekResponse {
        private String id;
        private String object;
        private long created;
        private String model;
        private List<Choice> choices;
        private Usage usage;
    }

    @Data
    private static class Choice {
        private int index;
        private Message message;
        @JsonProperty("finish_reason")
        private String finishReason;
    }

    /** 上游真实用量：平台成本核算的依据 */
    @Data
    public static class Usage {
        @JsonProperty("prompt_tokens")
        private long promptTokens;
        @JsonProperty("completion_tokens")
        private long completionTokens;
        @JsonProperty("total_tokens")
        private long totalTokens;
    }
}
