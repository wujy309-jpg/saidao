package com.training.backend.dto;

import lombok.Data;

/**
 * 更新评审维度请求DTO
 */
@Data
public class UpdateDimensionRequest {
    
    private Long id; // 维度ID（可选，用于更新现有维度）
    private String name; // 维度名称
    private Double weight; // 权重 (0-100)
    private Integer maxScore; // 最高分
    private String scoringCriteria; // 评分标准描述
    private Integer order; // 排序
}