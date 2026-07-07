package com.training.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * AI评审响应DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiReviewResponse {
    
    private Long id;
    private Long materialId;
    private String materialTitle;
    private String reviewType;
    private String reviewTypeDescription;
    
    // 评分
    private Integer totalScore;
    private Integer codeQualityScore;
    private Integer documentationScore;
    private Integer completenessScore;
    private Integer standardizationScore;
    
    // 评审结果
    private String feedback;
    private String suggestions;
    private String issuesFound;
    
    // 元数据
    private Long reviewDurationMs;
    private String modelVersion;
    private LocalDateTime createdAt;
}
