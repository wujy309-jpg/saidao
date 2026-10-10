package com.saidao.backend.dto;

import com.saidao.backend.entity.Team;

/** 团队简要信息,用于在其他实体响应中嵌入引用(避免序列化完整 Team 实体) */
public record TeamBrief(Long id, String name, String slogan) {
    public static TeamBrief from(Team team) {
        if (team == null) return null;
        return new TeamBrief(team.getId(), team.getName(), team.getSlogan());
    }
}
