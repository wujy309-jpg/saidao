package com.training.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 评审标准响应DTO
 */
@Data
public class ReviewCriteriaResponse {
    
    private Long id; // 标准ID
    private String name; // 标准名称
    private String description; // 标准描述
    private Long projectId; // 关联项目ID
    private String projectName; // 关联项目名称
    private Long taskId; // 关联任务ID
    private String taskTitle; // 关联任务标题
    private String difficultyLevel; // 难度级别
    private String difficultyLevelDescription; // 难度级别描述
    private String criteriaType; // 标准类型
    private String criteriaTypeDescription; // 标准类型描述
    private List<ReviewDimensionResponse> dimensions; // 评审维度列表
    private LocalDateTime createdAt; // 创建时间
    private LocalDateTime updatedAt; // 更新时间
}