package com.training.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 材料提交请求DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialSubmitRequest {
    
    @NotBlank(message = "标题不能为空")
    private String title;
    
    private String description;
    
    @NotNull(message = "材料类型不能为空")
    private String materialType;
    
    @NotNull(message = "任务ID不能为空")
    private Long taskId;
    
    private String version;
}
