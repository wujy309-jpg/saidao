package com.saidao.backend.dto;

import java.util.List;

/** 用户主页 DTO */
public record UserProfileDTO(
        Long id,
        String name,
        /** 头像引用：null=默认；preset:xxx=预设；/api/avatars/{id}?v=...=上传的图片 */
        String avatarUrl,
        String school,
        Integer reputation,
        Boolean verified,
        String role,
        int postCount,
        int replyCount,
        int acceptedCount,
        List<String> competitionHistory,
        int followingCount,
        int followerCount
) {}
