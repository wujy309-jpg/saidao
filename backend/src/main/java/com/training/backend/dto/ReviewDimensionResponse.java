package com.training.backend.dto;

import lombok.Data;

/**
 * 评审维度响应DTO
 */
@Data
public class ReviewDimensionResponse {
    
    private Long id; // 维度ID
    private String name; // 维度名称
    private Double weight; // 权重
    private Integer maxScore; // 最高分
    private String scoringCriteria; // 评分标准描述
    private Integer order; // 排序
}