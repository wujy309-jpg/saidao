package com.training.backend.dto;

import lombok.Data;
import java.util.List;

/**
 * 更新评审标准请求DTO
 */
@Data
public class UpdateCriteriaRequest {
    
    private String name; // 标准名称
    private String description; // 标准描述
    private Long projectId; // 关联项目ID（可选）
    private Long taskId; // 关联任务ID（可选）
    private String difficultyLevel; // 难度级别
    private String criteriaType; // 标准类型
    private List<UpdateDimensionRequest> dimensions; // 评审维度列表
}