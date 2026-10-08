package com.saidao.backend.service;

import com.saidao.backend.billing.BillingContext.BillingSession;
import com.saidao.backend.entity.AiCallLog;
import com.saidao.backend.entity.BillingSetting;
import com.saidao.backend.entity.TokenScene;
import com.saidao.backend.repository.AiCallLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * AI 调用日志：把每次计费请求的真实上游消耗记下来（token / 成本 / 耗时 / 成功或降级）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiCallLogService {

    private final AiCallLogRepository repository;
    private final TokenService tokenService;

    /**
     * 落一条调用日志。日志失败绝不能影响业务与计费，因此独立事务 + 吞异常。
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(BillingSession session, AiCallLog.CallStatus status, long chargedTokens, String errorType) {
        try {
            if (session == null) return;
            AiCallLog entry = new AiCallLog();
            entry.setRefId(session.ticket().refId());
            entry.setUserId(session.ticket().userId());
            entry.setScene(session.ticket().scene().name());
            entry.setStatus(status);
            entry.setLlmCalls(session.llmCalls());
            entry.setPromptTokens(session.promptTokens());
            entry.setCompletionTokens(session.completionTokens());
            entry.setTotalTokens(session.totalTokens());
            entry.setLatencyMs(session.latencyMs());
            entry.setChargedTokens(chargedTokens);
            entry.setModel(session.model());
            entry.setErrorType(truncate(errorType, 200));
            entry.setEstimatedCostYuan(estimateCost(session.promptTokens(), session.completionTokens()));
            entry.setCreatedAt(LocalDateTime.now());
            repository.save(entry);
        } catch (Exception e) {
            log.warn("AI 调用日志写入失败 refId={}: {}", session == null ? null : session.ticket().refId(), e.getMessage());
        }
    }

    /** 按后台配置单价估算上游成本（元） */
    public BigDecimal estimateCost(long promptTokens, long completionTokens) {
        BillingSetting s = tokenService.getSettings();
        BigDecimal in = s.getLlmInputPricePerMTok() == null ? new BigDecimal("2") : s.getLlmInputPricePerMTok();
        BigDecimal out = s.getLlmOutputPricePerMTok() == null ? new BigDecimal("8") : s.getLlmOutputPricePerMTok();
        BigDecimal million = new BigDecimal("1000000");
        return in.multiply(BigDecimal.valueOf(promptTokens)).divide(million, 6, RoundingMode.HALF_UP)
                .add(out.multiply(BigDecimal.valueOf(completionTokens)).divide(million, 6, RoundingMode.HALF_UP));
    }

    public Page<AiCallLog> search(Long userId, String scene, AiCallLog.CallStatus status,
                                  LocalDateTime start, LocalDateTime end, int page, int size) {
        return repository.search(userId, blankToNull(scene), status, start, end,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 200)));
    }

    /**
     * 成本与可观测面板数据：场景 × 次数 × token × 成本 + 成功率/降级率/P95 延迟 + 日趋势。
     */
    public Map<String, Object> stats(LocalDateTime start, LocalDateTime end) {
        List<Object[]> rows = repository.aggregateByScene(start, end,
                AiCallLog.CallStatus.SUCCESS, AiCallLog.CallStatus.DEGRADED, AiCallLog.CallStatus.FAILED);
        Map<String, List<Long>> latencyByScene = new HashMap<>();
        long allLatencySum = 0;
        List<Long> allLatencies = new ArrayList<>();
        for (Object[] row : repository.latencySamples(start, end)) {
            String scene = String.valueOf(row[0]);
            long latency = toLong(row[1]);
            latencyByScene.computeIfAbsent(scene, k -> new ArrayList<>()).add(latency);
            allLatencies.add(latency);
            allLatencySum += latency;
        }

        long totalCalls = 0, totalSuccess = 0, totalDegraded = 0, totalFailed = 0;
        long totalPrompt = 0, totalCompletion = 0, totalCharged = 0, totalLlmCalls = 0;
        BigDecimal totalCost = BigDecimal.ZERO;

        List<Map<String, Object>> scenes = new ArrayList<>();
        for (Object[] row : rows) {
            String scene = String.valueOf(row[0]);
            long calls = toLong(row[1]);
            long success = toLong(row[2]);
            long degraded = toLong(row[3]);
            long failed = toLong(row[4]);
            long prompt = toLong(row[5]);
            long completion = toLong(row[6]);
            long latencySum = toLong(row[7]);
            BigDecimal cost = toDecimal(row[8]);
            long charged = toLong(row[9]);
            long llmCalls = toLong(row[10]);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("scene", scene);
            m.put("label", sceneLabel(scene));
            m.put("calls", calls);
            m.put("llmCalls", llmCalls);
            m.put("success", success);
            m.put("degraded", degraded);
            m.put("failed", failed);
            m.put("successRate", rate(success, calls));
            m.put("degradedRate", rate(degraded, calls));
            m.put("failureRate", rate(failed, calls));
            m.put("promptTokens", prompt);
            m.put("completionTokens", completion);
            m.put("totalTokens", prompt + completion);
            m.put("avgTokensPerCall", calls > 0 ? (prompt + completion) / calls : 0);
            m.put("estimatedCostYuan", cost);
            m.put("chargedTokens", charged);
            m.put("revenueYuan", yuan(charged));
            m.put("grossProfitYuan", yuan(charged).subtract(cost));
            m.put("grossMargin", grossMargin(charged, cost));
            m.put("avgLatencyMs", llmCalls > 0 ? latencySum / llmCalls : 0);
            m.put("p95LatencyMs", percentile(latencyByScene.getOrDefault(scene, List.of()), 95));
            scenes.add(m);

            totalCalls += calls;
            totalSuccess += success;
            totalDegraded += degraded;
            totalFailed += failed;
            totalPrompt += prompt;
            totalCompletion += completion;
            totalCharged += charged;
            totalCost = totalCost.add(cost);
            totalLlmCalls += llmCalls;
        }
        scenes.sort((a, b) -> Long.compare(toLong(b.get("calls")), toLong(a.get("calls"))));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("calls", totalCalls);
        summary.put("llmCalls", totalLlmCalls);
        summary.put("success", totalSuccess);
        summary.put("degraded", totalDegraded);
        summary.put("failed", totalFailed);
        summary.put("successRate", rate(totalSuccess, totalCalls));
        summary.put("degradedRate", rate(totalDegraded, totalCalls));
        summary.put("promptTokens", totalPrompt);
        summary.put("completionTokens", totalCompletion);
        summary.put("totalTokens", totalPrompt + totalCompletion);
        summary.put("estimatedCostYuan", totalCost);
        summary.put("chargedTokens", totalCharged);
        summary.put("revenueYuan", yuan(totalCharged));
        summary.put("grossProfitYuan", yuan(totalCharged).subtract(totalCost));
        summary.put("grossMargin", grossMargin(totalCharged, totalCost));
        summary.put("avgLatencyMs", totalLlmCalls > 0 ? allLatencySum / totalLlmCalls : 0);
        summary.put("p95LatencyMs", percentile(allLatencies, 95));
        summary.put("inputPricePerMTok", tokenService.getSettings().getLlmInputPricePerMTok());
        summary.put("outputPricePerMTok", tokenService.getSettings().getLlmOutputPricePerMTok());

        List<Map<String, Object>> trend = new ArrayList<>();
        for (Object[] row : repository.aggregateByDay(start, end)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", String.valueOf(row[0]));
            m.put("calls", toLong(row[1]));
            m.put("totalTokens", toLong(row[2]));
            m.put("estimatedCostYuan", toDecimal(row[3]));
            m.put("chargedTokens", toLong(row[4]));
            trend.add(m);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("start", start.toString());
        result.put("end", end.toString());
        result.put("summary", summary);
        result.put("scenes", scenes);
        result.put("trend", trend);
        return result;
    }

    public String toCsv(LocalDateTime start, LocalDateTime end, int limit) {
        List<AiCallLog> logs = repository.search(null, null, null, start, end,
                PageRequest.of(0, Math.min(Math.max(1, limit), 20000))).getContent();
        StringBuilder sb = new StringBuilder();
        sb.append("时间,refId,用户ID,场景,状态,上游调用次数,输入token,输出token,总token,耗时ms,估算成本元,实收积分,模型,失败/降级原因\n");
        for (AiCallLog l : logs) {
            sb.append(csv(l.getCreatedAt() == null ? "" : l.getCreatedAt().toString())).append(',')
              .append(csv(l.getRefId())).append(',')
              .append(l.getUserId()).append(',')
              .append(csv(l.getScene())).append(',')
              .append(csv(l.getStatus() == null ? "" : l.getStatus().name())).append(',')
              .append(l.getLlmCalls()).append(',')
              .append(l.getPromptTokens()).append(',')
              .append(l.getCompletionTokens()).append(',')
              .append(l.getTotalTokens()).append(',')
              .append(l.getLatencyMs()).append(',')
              .append(l.getEstimatedCostYuan() == null ? "0" : l.getEstimatedCostYuan().toPlainString()).append(',')
              .append(l.getChargedTokens()).append(',')
              .append(csv(l.getModel())).append(',')
              .append(csv(l.getErrorType()))
              .append('\n');
        }
        return sb.toString();
    }

    /* ==================== 工具 ==================== */

    private BigDecimal yuan(long tokens) {
        // 1 Token = ¥0.01（面值）
        return BigDecimal.valueOf(tokens).multiply(new BigDecimal("0.01")).setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal grossMargin(long chargedTokens, BigDecimal cost) {
        BigDecimal revenue = yuan(chargedTokens);
        if (revenue.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;
        return revenue.subtract(cost).divide(revenue, 4, RoundingMode.HALF_UP);
    }

    private double rate(long part, long total) {
        if (total <= 0) return 0d;
        return Math.round(part * 10000d / total) / 10000d;
    }

    private long percentile(List<Long> values, int p) {
        if (values == null || values.isEmpty()) return 0;
        List<Long> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int idx = (int) Math.ceil(p / 100d * sorted.size()) - 1;
        return sorted.get(Math.max(0, Math.min(sorted.size() - 1, idx)));
    }

    private String sceneLabel(String scene) {
        try {
            return TokenScene.valueOf(scene).getLabel();
        } catch (Exception e) {
            return scene;
        }
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    private String csv(String v) {
        if (v == null) return "";
        if (v.contains(",") || v.contains("\"") || v.contains("\n")) {
            return '"' + v.replace("\"", "\"\"") + '"';
        }
        return v;
    }

    private long toLong(Object o) {
        if (o == null) return 0L;
        if (o instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(o));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private BigDecimal toDecimal(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal b) return b;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            return new BigDecimal(String.valueOf(o));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    public static LocalDate parseDate(String value, boolean endExclusive) {
        if (value == null || value.isBlank()) return null;
        try {
            LocalDate d = LocalDate.parse(value.trim());
            return endExclusive ? d.plusDays(1) : d;
        } catch (Exception e) {
            return null;
        }
    }
}
