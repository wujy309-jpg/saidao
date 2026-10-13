package com.saidao.backend.dto;

import com.saidao.backend.entity.ForumPost;

import java.time.LocalDateTime;

/** 论坛帖子列表 DTO（content 截断到 500 字） */
public record ForumPostDTO(
        Long id,
        String title,
        String content,
        String board,
        Long competitionId,
        String competitionName,
        Long authorId,
        String authorName,
        Integer authorReputation,
        Boolean authorVerified,
        /** 作者头像引用，列表页与作者卡片直接展示 */
        String authorAvatar,
        TeamBrief teamBrief,
        Integer likeCount,
        Integer replyCount,
        Integer viewCount,
        Integer favoriteCount,
        Boolean essence,
        Boolean pinned,
        Boolean liked,
        Boolean favorited,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ForumPostDTO from(ForumPost p, String competitionName, Boolean liked, Boolean favorited,
                                     Boolean authorVerified) {
        String content = p.getContent();
        if (content != null && content.length() > 500) {
            content = content.substring(0, 500);
        }
        return new ForumPostDTO(
                p.getId(),
                p.getTitle(),
                content,
                p.getBoard() == null ? null : p.getBoard().name(),
                p.getCompetitionId(),
                competitionName,
                p.getAuthor() == null ? null : p.getAuthor().getId(),
                p.getAuthor() == null ? null : p.getAuthor().getName(),
                p.getAuthor() == null ? null : p.getAuthor().getReputation(),
                authorVerified,
                p.getAuthor() == null ? null : p.getAuthor().getAvatarUrl(),
                p.getTeamBrief(),
                p.getLikeCount(),
                p.getReplyCount(),
                p.getViewCount(),
                p.getFavoriteCount(),
                p.getEssence(),
                p.getPinned(),
                liked,
                favorited,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
