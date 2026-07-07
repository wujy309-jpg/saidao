package com.training.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 评价实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "evaluations")
public class Evaluation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluator_id", nullable = false)
    @NotNull(message = "评价人不能为空")
    private User evaluator;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluatee_id", nullable = false)
    @NotNull(message = "被评价人不能为空")
    private User evaluatee;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    @NotNull(message = "评价类型不能为空")
    private EvaluationType type;
    
    // 五维度评分
    @Column(name = "tech_score")
    @Min(value = 0, message = "技术能力分数不能小于0")
    @Max(value = 100, message = "技术能力分数不能大于100")
    private Integer techScore; // 技术能力
    
    @Column(name = "teamwork_score")
    @Min(value = 0, message = "团队协作分数不能小于0")
    @Max(value = 100, message = "团队协作分数不能大于100")
    private Integer teamworkScore; // 团队协作
    
    @Column(name = "document_score")
    @Min(value = 0, message = "文档质量分数不能小于0")
    @Max(value = 100, message = "文档质量分数不能大于100")
    private Integer documentScore; // 文档质量
    
    @Column(name = "innovation_score")
    @Min(value = 0, message = "创新能力分数不能小于0")
    @Max(value = 100, message = "创新能力分数不能大于100")
    private Integer innovationScore; // 创新能力
    
    @Column(name = "attitude_score")
    @Min(value = 0, message = "工作态度分数不能小于0")
    @Max(value = 100, message = "工作态度分数不能大于100")
    private Integer attitudeScore; // 工作态度
    
    @Column(name = "total_score")
    private Integer totalScore; // 综合得分
    
    @Column(length = 1000)
    private String comment; // 评价意见
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        calculateTotalScore();
    }
    
    /**
     * 计算综合得分（五维度加权平均）
     */
    public void calculateTotalScore() {
        if (techScore != null && teamworkScore != null && documentScore != null 
            && innovationScore != null && attitudeScore != null) {
            // 权重：技术能力30%，团队协作20%，文档质量20%，创新能力15%，工作态度15%
            this.totalScore = (int) (
                techScore * 0.3 + 
                teamworkScore * 0.2 + 
                documentScore * 0.2 + 
                innovationScore * 0.15 + 
                attitudeScore * 0.15
            );
        }
    }
    
    /**
     * 验证分数是否有效
     */
    public boolean isValidScore() {
        return techScore != null && techScore >= 0 && techScore <= 100 &&
               teamworkScore != null && teamworkScore >= 0 && teamworkScore <= 100 &&
               documentScore != null && documentScore >= 0 && documentScore <= 100 &&
               innovationScore != null && innovationScore >= 0 && innovationScore <= 100 &&
               attitudeScore != null && attitudeScore >= 0 && attitudeScore <= 100;
    }
    
    /**
     * 评价类型枚举
     */
    public enum EvaluationType {
        TEACHER("教师评价"),
        ENTERPRISE("企业评价"),
        PEER("同伴互评");
        
        private final String description;
        
        EvaluationType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}
