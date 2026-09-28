package com.saidao.backend.dto;

import com.saidao.backend.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {
    
    @NotBlank(message = "原密码不能为空")
    private String oldPassword;
    
    @NotBlank(message = "新密码不能为空")
    @StrongPassword(message = "密码必须包含大小写字母、数字和特殊字符，长度至少8位")
    private String newPassword;
}
