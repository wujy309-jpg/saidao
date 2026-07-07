package com.training.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 学习步骤响应DTO
 */
@Data
public class LearningStepResponse {
    
    private Long id; // 步骤ID
    private Long learningPathId; // 学习路径ID
    private String title; // 步骤标题
    private String description; // 步骤描述
    private String stepType; // 步骤类型
    private String stepTypeDescription; // 步骤类型描述
    private Integer order; // 排序
    private String status; // 状态
    private String statusDescription; // 状态描述
    private Integer estimatedHours; // 预计时长
    private Integer actualHours; // 实际时长
    private String resources; // 学习资源（JSON格式）
    private LocalDateTime startedAt; // 开始时间
    private LocalDateTime completedAt; // 完成时间
}