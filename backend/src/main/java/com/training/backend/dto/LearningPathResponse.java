package com.training.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 学习路径响应DTO
 */
@Data
public class LearningPathResponse {
    
    private Long id; // 路径ID
    private Long studentId; // 学生ID
    private String studentName; // 学生姓名
    private Long projectId; // 关联项目ID
    private String projectName; // 关联项目名称
    private String pathName; // 路径名称
    private String description; // 路径描述
    private String status; // 状态
    private String statusDescription; // 状态描述
    private Integer estimatedDuration; // 预计时长（小时）
    private Integer actualDuration; // 实际时长（小时）
    private List<LearningStepResponse> steps; // 学习步骤
    private Integer completedSteps; // 已完成步骤数
    private Integer totalSteps; // 总步骤数
    private Double progress; // 进度百分比
    private LocalDateTime createdAt; // 创建时间
    private LocalDateTime updatedAt; // 更新时间
}