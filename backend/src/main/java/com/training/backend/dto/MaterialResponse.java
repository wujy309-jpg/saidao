package com.training.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 材料响应DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialResponse {
    
    private Long id;
    private String title;
    private String description;
    private String materialType;
    private String materialTypeDescription;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String version;
    private String status;
    private String statusDescription;
    
    // 提交者信息
    private Long submittedById;
    private String submittedByName;
    
    // 任务信息
    private Long taskId;
    private String taskTitle;
    
    // AI评审信息
    private Integer aiScore;
    private String aiFeedback;
    
    // 人工评审信息
    private Long reviewedBy;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private String reviewComment;
    
    // 时间信息
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
