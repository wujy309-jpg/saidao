package com.saidao.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 学生自助注册请求
 */
@Data
public class RegisterRequest {
    
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 50, message = "用户名长度需在3-50之间")
    private String username;
    
    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 100, message = "密码长度需在6-100之间")
    private String password;
    
    @NotBlank(message = "姓名不能为空")
    @Size(max = 50, message = "姓名过长")
    private String name;
    
    private String email;
    
    private String phone;
    
    private String studentId;
    
    /** 注册时可选携带的学科/专业/年级，用于跳过或预填画像问卷 */
    private String discipline;
    private String major;
    private Integer grade;
}
