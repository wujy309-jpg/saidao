package com.saidao.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 保存用户画像请求
 */
@Data
public class SaveProfileRequest {
    
    @NotNull(message = "学科不能为空")
    private String discipline;
    
    private String major;
    
    @NotNull(message = "年级不能为空")
    private Integer grade;
    
    private List<String> interests;
    
    private List<String> skills;
    
    private List<String> goals;
    
    private Integer weeklyHours;
    
    private Boolean hasExperience;
    
    private String preferredLevel;
    
    private String description;
    
    /** 学校 */
    private String school;
    
    /** 获奖履历 */
    private String achievements;
}
