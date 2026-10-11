package com.saidao.backend.dto;

import java.util.List;

/** 用户主页 DTO */
public record UserProfileDTO(
        Long id,
        String name,
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
