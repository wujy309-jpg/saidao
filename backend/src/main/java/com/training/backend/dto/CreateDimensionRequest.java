package com.training.backend.dto;

import lombok.Data;

/**
 * 创建评审维度请求DTO
 */
@Data
public class CreateDimensionRequest {
    
    private String name; // 维度名称
    private Double weight; // 权重 (0-100)
    private Integer maxScore; // 最高分
    private String scoringCriteria; // 评分标准描述
    private Integer order; // 排序
}