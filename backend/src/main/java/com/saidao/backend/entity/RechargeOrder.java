package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值订单（人工确认收款/卡密模式；预留支付网关扩展）
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "recharge_order", indexes = {
    @Index(name = "idx_order_no", columnList = "order_no", unique = true),
    @Index(name = "idx_order_user", columnList = "user_id"),
    @Index(name = "idx_order_status", columnList = "status")
})
public class RechargeOrder {

    public enum OrderStatus { PENDING, PAID, CANCELLED }

    public enum PayChannel { WECHAT, ALIPAY, BANK_TRANSFER, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no", nullable = false, unique = true, length = 32)
    private String orderNo;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "package_id")
    private Long packageId;

    /** 套餐名快照（套餐后续修改不影响历史订单） */
    @Column(name = "package_name", length = 50)
    private String packageName;

    /** 应付金额（元） */
    @Column(name = "price_yuan", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceYuan;

    /** 到账 Token 数（快照） */
    @Column(nullable = false)
    private long tokens;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayChannel channel = PayChannel.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(length = 200)
    private String remark;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /** 确认收款的管理员用户名 */
    @Column(name = "paid_by", length = 50)
    private String paidBy;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
