package com.saidao.backend.dto;

import java.time.LocalDateTime;

/**
 * 「账号设置」页所需的本人账号视图。
 *
 * <p>头像与昵称的自助修改接口统一返回本对象，前端一次往返即可同步本地登录态，
 * 不需要改完再拉一次详情（避免顶部导航短暂显示旧昵称）。
 */
public record AccountDTO(
        Long id,
        String username,
        String name,
        /** null=默认头像；preset:xxx=预设头像；/api/avatars/{id}?v=...=上传的图片 */
        String avatarUrl,
        String role,
        String email,
        String phone,
        String studentId,
        String school,
        Boolean verified,
        Integer reputation,
        LocalDateTime createdAt
) {}
