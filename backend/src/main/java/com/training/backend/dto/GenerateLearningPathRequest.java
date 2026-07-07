package com.training.backend.dto;

import lombok.Data;

/**
 * 生成学习路径请求DTO
 */
@Data
public class GenerateLearningPathRequest {
    
    private Long studentId; // 学生ID
    private String studentProfile; // 学生档案
    private String learningGoal; // 学习目标
    private String currentLevel; // 当前水平
    private Long projectId; // 关联项目ID（可选）
}