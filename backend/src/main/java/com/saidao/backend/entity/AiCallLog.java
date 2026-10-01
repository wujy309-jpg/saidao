package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * AI 调用日志（一次计费请求一行）：把「平台收了多少 Token」与「上游真实花了多少 token/多少钱」对齐。
 *
 * <p>用于后台成本面板：场景 × 次数 × token × 成本、成功率、降级率、P95 延迟。
 * 有了它才谈得上「毛利算得出来」——此前 DeepSeek 的 usage 完全没有采集。
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "ai_call_log", indexes = {
    @Index(name = "idx_ai_log_ref", columnList = "ref_id", unique = true),
    @Index(name = "idx_ai_log_user", columnList = "user_id"),
    @Index(name = "idx_ai_log_scene", columnList = "scene"),
    @Index(name = "idx_ai_log_status", columnList = "status"),
    @Index(name = "idx_ai_log_created", columnList = "created_at")
})
public class AiCallLog {

    public enum CallStatus {
        /** 上游正常返回，按次正常计费 */
        SUCCESS,
        /** 上游不可用/返回空，走了兜底模板，本次免扣 */
        DEGRADED,
        /** 业务失败（前置校验、异常），本次免扣 */
        FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 与 TokenCharge.ref_id / TokenTransaction.ref_id 一致 */
    @Column(name = "ref_id", nullable = false, unique = true, length = 64)
    private String refId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 40)
    private String scene;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CallStatus status;

    /** 该次请求实际产生的上游调用次数（一般 1，重排/兜底可能 0） */
    @Column(name = "llm_calls", nullable = false)
    private int llmCalls;

    @Column(name = "prompt_tokens", nullable = false)
    private long promptTokens;

    @Column(name = "completion_tokens", nullable = false)
    private long completionTokens;

    @Column(name = "total_tokens", nullable = false)
    private long totalTokens;

    /** 上游耗时（毫秒，多次调用累加） */
    @Column(name = "latency_ms", nullable = false)
    private long latencyMs;

    /** 按后台配置的单价估算的上游成本（元） */
    @Column(name = "estimated_cost_yuan", precision = 12, scale = 6)
    private BigDecimal estimatedCostYuan;

    /** 平台实收 Token（降级/失败为 0） */
    @Column(name = "charged_tokens", nullable = false)
    private long chargedTokens;

    /** 上游模型名 */
    @Column(length = 60)
    private String model;

    /** 失败/降级原因（错误类型或说明） */
    @Column(name = "error_type", length = 200)
    private String errorType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
