package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 卡密（预生成批次，用户兑换后一次性核销）
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "card_key", indexes = {
    @Index(name = "idx_card_code", columnList = "code", unique = true),
    @Index(name = "idx_card_batch", columnList = "batch_no"),
    @Index(name = "idx_card_status", columnList = "status")
})
public class CardKey {

    public enum CardStatus { UNUSED, USED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 16 位兑换码（去易混淆字符，含批次校验段） */
    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(name = "batch_no", nullable = false, length = 32)
    private String batchNo;

    @Column(name = "package_id")
    private Long packageId;

    @Column(name = "package_name", length = 50)
    private String packageName;

    /** 兑换到账 Token 数 */
    @Column(nullable = false)
    private long tokens;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CardStatus status = CardStatus.UNUSED;

    @Column(name = "used_by_user_id")
    private Long usedByUserId;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(length = 200)
    private String remark;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
