package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 用户 Token 账户（余额与累计统计）
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "token_account", indexes = {
    @Index(name = "idx_token_account_user", columnList = "user_id", unique = true)
})
public class TokenAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 当前余额（不可为负） */
    @Column(nullable = false)
    private long balance = 0L;

    /** 累计充值到账（含卡密） */
    @Column(name = "total_recharged", nullable = false)
    private long totalRecharged = 0L;

    /** 累计消耗 */
    @Column(name = "total_consumed", nullable = false)
    private long totalConsumed = 0L;

    /** 累计免费赠送（注册赠送+每日赠送） */
    @Column(name = "total_granted", nullable = false)
    private long totalGranted = 0L;

    /** 最近一次领取每日免费额度日期（防重复领取） */
    @Column(name = "last_free_grant_date")
    private LocalDate lastFreeGrantDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
