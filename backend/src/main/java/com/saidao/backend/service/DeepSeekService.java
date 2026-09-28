package com.saidao.backend.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 * DeepSeek 大模型服务（竞赛推荐与 AI 助手使用）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeepSeekService {
    
    private final DeepSeekConfig config;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * 通用对话
     */
    public String chat(String systemPrompt, String userMessage) {
        if (!isApiEnabled()) {
            log.warn("DeepSeek API 未启用或未配置 API Key");
            return null;
        }
        
        try {
            List<Message> messages = List.of(
                new Message("system", systemPrompt),
                new Message("user", userMessage)
            );
            
            DeepSeekResponse response = callApi(messages);
            
            if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
                return response.getChoices().get(0).getMessage().getContent();
            }
            
            return null;
        } catch (Exception e) {
            log.error("DeepSeek API调用失败", e);
            return null;
        }
    }
    
    /**
     * 流式对话:逐段回调 delta,返回完整回复;API 不可用时返回 null(由调用方降级)
     */
    public String chatStream(String systemPrompt, List<Message> messages, int maxTokens,
                             Consumer<String> onDelta) {
        if (!isApiEnabled()) {
            log.warn("DeepSeek API 未启用或未配置 API Key,助手将使用降级回复");
            return null;
        }
        try {
            List<Message> all = new java.util.ArrayList<>();
            all.add(new Message("system", systemPrompt));
            all.addAll(messages);
            
            ObjectMapper mapper = new ObjectMapper();
            java.util.Map<String, Object> bodyMap = new java.util.HashMap<>();
            bodyMap.put("model", config.getModel());
            bodyMap.put("messages", all.stream().map(m -> java.util.Map.of("role", m.getRole(), "content", m.getContent())).toList());
            bodyMap.put("stream", true);
            bodyMap.put("max_tokens", maxTokens);
            bodyMap.put("temperature", config.getTemperature());
            if (config.getReasoningEffort() != null && !config.getReasoningEffort().isBlank()) {
                bodyMap.put("reasoning_effort", config.getReasoningEffort());
            }
            String body = mapper.writeValueAsString(bodyMap);
            
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(30))
                    .build();
            HttpRequest request = HttpRequest.newBuilder(
                            URI.create(config.getBaseUrl() + "/v1/chat/completions"))
                    .timeout(Duration.ofMinutes(5))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + config.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            
            HttpResponse<InputStream> resp = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (resp.statusCode() != 200) {
                log.error("DeepSeek 流式调用失败: HTTP {}", resp.statusCode());
                return null;
            }
            
            StringBuilder full = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resp.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data:")) continue;
                    String payload = line.substring(5).trim();
                    if ("[DONE]".equals(payload)) break;
                    try {
                        JsonNode node = mapper.readTree(payload);
                        JsonNode delta = node.path("choices").path(0).path("delta").path("content");
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
            return full.toString();
        } catch (Exception e) {
            log.error("DeepSeek 流式调用失败", e);
            return null;
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
    }
    
    @Data
    private static class Choice {
        private int index;
        private Message message;
        @JsonProperty("finish_reason")
        private String finishReason;
    }
}
