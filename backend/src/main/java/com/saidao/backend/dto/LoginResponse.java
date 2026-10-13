package com.saidao.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 登录响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    
    private String token;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private UserInfo user;
    
    /**
     * 用户信息
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String name;
        private String role;
        private String email;
        /** 头像引用：null=默认；preset:xxx=预设；/api/avatars/{id}?v=...=上传的图片 */
        private String avatarUrl;
        /** 社区声望，顶栏等级徽章直接用它，省掉一次额外请求 */
        private Integer reputation;
    }
}
