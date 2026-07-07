package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 评审标准实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "review_criteria")
public class ReviewCriteria {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name; // 标准名称
    
    @Column(length = 500)
    private String description; // 标准描述
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project; // 关联项目（可选）
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task; // 关联任务（可选）
    
    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty_level")
    private DifficultyLevel difficultyLevel; // 难度级别
    
    @Enumerated(EnumType.STRING)
    @Column(name = "criteria_type")
    private CriteriaType criteriaType; // 标准类型
    
    @OneToMany(mappedBy = "criteria", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("order ASC")
    private List<ReviewDimension> dimensions; // 评审维度
    
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
    
    /**
     * 难度级别枚举
     */
    public enum DifficultyLevel {
        BEGINNER("初级"),
        INTERMEDIATE("中级"),
        ADVANCED("高级");
        
        private final String description;
        
        DifficultyLevel(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * 标准类型枚举
     */
    public enum CriteriaType {
        CODE("代码"),
        DOCUMENT("文档"),
        PROJECT("项目"),
        COMPREHENSIVE("综合");
        
        private final String description;
        
        CriteriaType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}