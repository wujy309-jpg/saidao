package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Token 流水（全量、不可删改，用于对账）
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "token_transaction", indexes = {
    @Index(name = "idx_token_tx_user", columnList = "user_id"),
    @Index(name = "idx_token_tx_type", columnList = "type"),
    @Index(name = "idx_token_tx_created", columnList = "created_at")
})
public class TokenTransaction {

    /** 流水类型 */
    public enum TxType {
        /** 充值订单入账 */
        RECHARGE,
        /** 卡密兑换入账 */
        CARD,
        /** AI 场景扣费 */
        CONSUME,
        /** 失败自动退款 */
        REFUND,
        /** 免费赠送（注册赠送/每日赠送） */
        GRANT,
        /** 管理员手动调整（正加负减） */
        ADJUST
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TxType type;

    /** 扣费场景（CONSUME/REFUND 时填写，如 ASSISTANT_CHAT） */
    @Column(length = 40)
    private String scene;

    /** 金额（带符号：入账为正、扣费为负） */
    @Column(nullable = false)
    private long amount;

    /** 交易后余额快照 */
    @Column(name = "balance_after", nullable = false)
    private long balanceAfter;

    /** 关联 ID（订单号/卡密批次/会话 ID 等） */
    @Column(name = "ref_id", length = 64)
    private String refId;

    @Column(length = 255)
    private String remark;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
