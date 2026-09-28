package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值套餐
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "token_package")
public class TokenPackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 200)
    private String description;

    /** 售价（元） */
    @Column(name = "price_yuan", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceYuan;

    /** 基础 Token 数 */
    @Column(nullable = false)
    private long tokens;

    /** 赠送 Token 数 */
    @Column(name = "bonus_tokens", nullable = false)
    private long bonusTokens = 0L;

    @Column(nullable = false)
    private boolean enabled = true;

    /** 排序（小的在前） */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

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

    /** 到账 Token 总数（基础+赠送） */
    @Transient
    public long totalTokens() {
        return tokens + bonusTokens;
    }
}
