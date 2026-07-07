package com.training.backend.dto;

import lombok.Data;
import java.util.List;

/**
 * 创建学习路径请求DTO
 */
@Data
public class CreateLearningPathRequest {
    
    private Long studentId; // 学生ID
    private Long projectId; // 关联项目ID（可选）
    private String pathName; // 路径名称
    private String description; // 路径描述
    private Integer estimatedDuration; // 预计时长（小时）
    private List<CreateLearningStepRequest> steps; // 学习步骤
}