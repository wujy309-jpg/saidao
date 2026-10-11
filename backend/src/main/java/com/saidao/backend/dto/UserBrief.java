package com.saidao.backend.dto;

import com.saidao.backend.entity.User;
import com.saidao.backend.entity.UserProfile;

/** Public user shape for collaboration responses. Never expose credentials or PII. */
public record UserBrief(Long id, String name, Integer reputation, String role,
                        Boolean verified, String school) {
    public static UserBrief from(User user) {
        if (user == null) return null;
        return new UserBrief(user.getId(), user.getName(), user.getReputation(),
                user.getRole() == null ? null : user.getRole().name(),
                null, null);
    }

    public static UserBrief from(User user, UserProfile profile) {
        if (user == null) return null;
        return new UserBrief(user.getId(), user.getName(), user.getReputation(),
                user.getRole() == null ? null : user.getRole().name(),
                profile != null ? profile.getVerified() : null,
                profile != null ? profile.getSchool() : null);
    }
}
