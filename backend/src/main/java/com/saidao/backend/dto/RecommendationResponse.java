package com.saidao.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 推荐结果响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResponse {
    
    private List<RecommendationItem> items;
    private LocalDateTime generatedAt;
    private String profileSummary;
}
