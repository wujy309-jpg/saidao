package com.training.backend.dto;

import lombok.Data;

/**
 * 创建学习步骤请求DTO
 */
@Data
public class CreateLearningStepRequest {
    
    private String title; // 步骤标题
    private String description; // 步骤描述
    private String stepType; // 步骤类型：LEARNING, PRACTICE, PROJECT, REVIEW
    private Integer order; // 排序
    private Integer estimatedHours; // 预计时长
    private String resources; // 学习资源（JSON格式）
}