package com.saidao.backend.billing;

import com.saidao.backend.entity.TokenScene;

/**
 * 一次计费请求的上下文（ThreadLocal）：把「预留的 Token」与「这次请求真实的 LLM 消耗」绑在一起。
 *
 * <p>由 {@code AiBillingService.charge} 创建，切面 / SSE 控制器负责在 finally 中 {@link #clear()}。
 * {@code DeepSeekService} 每完成一次上游调用就调 {@link #recordLlm}，因此
 * 「降级」对计费层是可知的——这正是此前「降级也按全价收费」的根因。
 */
public final class BillingContext {

    private static final ThreadLocal<BillingSession> CURRENT = new ThreadLocal<>();

    private BillingContext() {
    }

    /** 计费票据：refId 是全链路归因键；charged=false 表示本次未真正扣费（计费关闭/场景免费） */
    public record ChargeTicket(Long userId, TokenScene scene, String refId, long amount, boolean charged) {
        public static ChargeTicket free(Long userId, TokenScene scene, String refId) {
            return new ChargeTicket(userId, scene, refId, 0L, false);
        }
    }

    /** 会话内的 LLM 消耗累计 */
    public static final class BillingSession {
        private final ChargeTicket ticket;
        private int llmCalls;
        private long promptTokens;
        private long completionTokens;
        private long latencyMs;
        private String model;
        private boolean degraded;
        private String degradedReason;

        BillingSession(ChargeTicket ticket) {
            this.ticket = ticket;
        }

        public ChargeTicket ticket() {
            return ticket;
        }

        public int llmCalls() {
            return llmCalls;
        }

        public long promptTokens() {
            return promptTokens;
        }

        public long completionTokens() {
            return completionTokens;
        }

        public long totalTokens() {
            return promptTokens + completionTokens;
        }

        public long latencyMs() {
            return latencyMs;
        }

        public String model() {
            return model;
        }

        public boolean degraded() {
            return degraded;
        }

        public String degradedReason() {
            return degradedReason;
        }

        void addLlmCall(String model, long prompt, long completion, long latency, boolean callDegraded, String reason) {
            this.llmCalls++;
            this.promptTokens += Math.max(0, prompt);
            this.completionTokens += Math.max(0, completion);
            this.latencyMs += Math.max(0, latency);
            if (model != null && !model.isBlank()) {
                this.model = model;
            }
            if (callDegraded) {
                this.degraded = true;
                if (this.degradedReason == null || this.degradedReason.isBlank()) {
                    this.degradedReason = reason;
                }
            }
        }

        void markDegraded(String reason) {
            this.degraded = true;
            if (this.degradedReason == null || this.degradedReason.isBlank()) {
                this.degradedReason = reason;
            }
        }
    }

    public static BillingSession start(ChargeTicket ticket) {
        BillingSession session = new BillingSession(ticket);
        CURRENT.set(session);
        return session;
    }

    public static BillingSession current() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }

    /** DeepSeekService 调用上游后回填；不在计费上下文内（如定时任务）时静默忽略 */
    public static void recordLlm(String model, long promptTokens, long completionTokens,
                                 long latencyMs, boolean degraded, String reason) {
        BillingSession session = CURRENT.get();
        if (session != null) {
            session.addLlmCall(model, promptTokens, completionTokens, latencyMs, degraded, reason);
        }
    }

    /** 业务侧发现产出无效（如「换一个任务」没有换掉）时可主动标记降级 */
    public static void markDegraded(String reason) {
        BillingSession session = CURRENT.get();
        if (session != null) {
            session.markDegraded(reason);
        }
    }
}
