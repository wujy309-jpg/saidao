package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 学习步骤实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "learning_steps")
public class LearningStep {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_path_id", nullable = false)
    private LearningPath learningPath;
    
    @Column(nullable = false, length = 100)
    private String title; // 步骤标题
    
    @Column(length = 500)
    private String description; // 步骤描述
    
    @Enumerated(EnumType.STRING)
    @Column(name = "step_type")
    private StepType stepType; // 步骤类型
    
    @Column(name = "step_order")
    private Integer order; // 排序
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private StepStatus status; // 状态
    
    @Column(name = "estimated_hours")
    private Integer estimatedHours; // 预计时长
    
    @Column(name = "actual_hours")
    private Integer actualHours; // 实际时长
    
    @Column(name = "resources", length = 2000)
    private String resources; // 学习资源（JSON格式）
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @PrePersist
    protected void onCreate() {
        if (status == null) {
            status = StepStatus.NOT_STARTED;
        }
    }
    
    /**
     * 步骤类型枚举
     */
    public enum StepType {
        LEARNING("学习"),
        PRACTICE("练习"),
        PROJECT("项目"),
        REVIEW("复习");
        
        private final String description;
        
        StepType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * 步骤状态枚举
     */
    public enum StepStatus {
        NOT_STARTED("未开始"),
        IN_PROGRESS("进行中"),
        COMPLETED("已完成"),
        SKIPPED("已跳过");
        
        private final String description;
        
        StepStatus(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}