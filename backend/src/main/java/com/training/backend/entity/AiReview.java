package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * AI评审结果实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ai_reviews")
public class AiReview {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private TrainingMaterial material;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "review_type", nullable = false)
    private ReviewType reviewType;
    
    @Column(name = "total_score")
    private Integer totalScore;
    
    @Column(name = "code_quality_score")
    private Integer codeQualityScore;
    
    @Column(name = "documentation_score")
    private Integer documentationScore;
    
    @Column(name = "completeness_score")
    private Integer completenessScore;
    
    @Column(name = "standardization_score")
    private Integer standardizationScore;
    
    @Column(name = "feedback", length = 5000)
    private String feedback;
    
    @Column(name = "suggestions", length = 5000)
    private String suggestions;
    
    @Column(name = "issues_found", length = 5000)
    private String issuesFound;
    
    @Column(name = "review_duration_ms")
    private Long reviewDurationMs;
    
    @Column(name = "model_version", length = 50)
    private String modelVersion;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (modelVersion == null) {
            modelVersion = "1.0";
        }
    }
    
    /**
     * 评审类型枚举
     */
    public enum ReviewType {
        CODE_ANALYSIS("代码分析"),
        DOCUMENT_ANALYSIS("文档分析"),
        REQUIREMENT_CHECK("需求检查"),
        DESIGN_REVIEW("设计评审"),
        TEST_COVERAGE("测试覆盖");
        
        private final String description;
        
        ReviewType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}
