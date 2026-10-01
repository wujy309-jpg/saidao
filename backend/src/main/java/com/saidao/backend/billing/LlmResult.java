package com.saidao.backend.billing;

import com.saidao.backend.service.DeepSeekService;

/**
 * 一次大模型调用的结构化结果：内容 + 是否降级 + 真实 token 用量 + 耗时。
 *
 * <p>此前 {@code DeepSeekService.chat()} 失败返回 null、调用方各自兜底，
 * 计费层完全看不到「这次其实是降级」，只能按全价扣。用这个对象把降级变成可判断的信号。
 */
public record LlmResult(
        String content,
        boolean degraded,
        String errorType,
        long promptTokens,
        long completionTokens,
        long latencyMs,
        String finishReason,
        String model
) {

    public static LlmResult ok(String content, long promptTokens, long completionTokens,
                               long latencyMs, String finishReason, String model) {
        return new LlmResult(content, false, null, promptTokens, completionTokens,
                latencyMs, finishReason, model);
    }

    public static LlmResult degraded(String errorType) {
        return new LlmResult(null, true, errorType, 0, 0, 0, null, null);
    }

    public boolean hasContent() {
        return content != null && !content.isBlank();
    }

    /** 内容为空也算降级（上游 200 但没给东西） */
    public LlmResult asDegradedIfEmpty(String errorType) {
        return hasContent() ? this : new LlmResult(null, true, errorType,
                promptTokens, completionTokens, latencyMs, finishReason, model);
    }

    public DeepSeekService.Message toMessage(String role) {
        return new DeepSeekService.Message(role, content);
    }
}
