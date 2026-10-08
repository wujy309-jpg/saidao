package com.saidao.backend.dto;

import com.saidao.backend.entity.User;

/** Public user shape for collaboration responses. Never expose credentials or PII. */
public record UserBrief(Long id, String name, Integer reputation, String role) {
    public static UserBrief from(User user) {
        if (user == null) return null;
        return new UserBrief(user.getId(), user.getName(), user.getReputation(),
                user.getRole() == null ? null : user.getRole().name());
    }
}
