package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * AI 场景定价配置（后台可实时调整，无需改代码）
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "token_scene_config", indexes = {
    @Index(name = "idx_scene_key", columnList = "scene", unique = true)
})
public class TokenSceneConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 场景 key（对应 TokenScene 枚举） */
    @Column(nullable = false, unique = true, length = 40)
    private String scene;

    /** 展示名 */
    @Column(nullable = false, length = 50)
    private String label;

    /** 单价（Token/次） */
    @Column(nullable = false)
    private long price;

    /** 是否收费（false = 该场景免费） */
    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
