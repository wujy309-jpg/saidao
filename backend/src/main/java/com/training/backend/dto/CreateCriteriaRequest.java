package com.training.backend.dto;

import lombok.Data;
import java.util.List;

/**
 * 创建评审标准请求DTO
 */
@Data
public class CreateCriteriaRequest {
    
    private String name; // 标准名称
    private String description; // 标准描述
    private Long projectId; // 关联项目ID（可选）
    private Long taskId; // 关联任务ID（可选）
    private String difficultyLevel; // 难度级别：BEGINNER, INTERMEDIATE, ADVANCED
    private String criteriaType; // 标准类型：CODE, DOCUMENT, PROJECT, COMPREHENSIVE
    private List<CreateDimensionRequest> dimensions; // 评审维度列表
}