package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 全局计费设置（单行，id 固定为 1）
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "billing_setting")
public class BillingSetting {

    @Id
    private Long id = 1L;

    /** 每日免费赠送 Token */
    @Column(name = "daily_free_tokens", nullable = false)
    private long dailyFreeTokens = 5L;

    /** 注册赠送 Token */
    @Column(name = "register_bonus_tokens", nullable = false)
    private long registerBonusTokens = 50L;

    /** 免费额度总开关 */
    @Column(name = "free_quota_enabled", nullable = false)
    private boolean freeQuotaEnabled = true;

    /** 收款说明（展示在充值中心） */
    @Column(name = "payment_note", length = 1000)
    private String paymentNote = "转账时请备注订单号，转账后联系管理员确认到账。";

    /** 微信收款码图片地址 */
    @Column(name = "wechat_qr_url", length = 500)
    private String wechatQrUrl;

    /** 支付宝收款码图片地址 */
    @Column(name = "alipay_qr_url", length = 500)
    private String alipayQrUrl;

    /** 上游 LLM 输入单价（元 / 百万 token），后台成本核算用 */
    @Column(name = "llm_input_price_per_mtok", nullable = false, precision = 10, scale = 4)
    private java.math.BigDecimal llmInputPricePerMTok = new java.math.BigDecimal("2.0000");

    /** 上游 LLM 输出单价（元 / 百万 token） */
    @Column(name = "llm_output_price_per_mtok", nullable = false, precision = 10, scale = 4)
    private java.math.BigDecimal llmOutputPricePerMTok = new java.math.BigDecimal("8.0000");

    /** 待确认订单超过多少小时算超时（后台提醒阈值，默认 24） */
    @Column(name = "pending_order_alert_hours", nullable = false)
    private int pendingOrderAlertHours = 24;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
