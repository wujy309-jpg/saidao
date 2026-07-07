package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 评审维度实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "review_dimensions")
public class ReviewDimension {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criteria_id", nullable = false)
    private ReviewCriteria criteria; // 关联评审标准
    
    @Column(nullable = false, length = 50)
    private String name; // 维度名称
    
    @Column(nullable = false)
    private Double weight; // 权重 (0-100)
    
    @Column(name = "max_score")
    private Integer maxScore; // 最高分
    
    @Column(name = "scoring_criteria", length = 1000)
    private String scoringCriteria; // 评分标准描述
    
    @Column(name = "dimension_order")
    private Integer order; // 排序
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}