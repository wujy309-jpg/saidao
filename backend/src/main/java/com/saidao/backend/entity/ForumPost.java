package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 论坛帖子实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "forum_posts", indexes = {
    @Index(name = "idx_fp_board", columnList = "board"),
    @Index(name = "idx_fp_created", columnList = "created_at"),
    @Index(name = "idx_fp_author", columnList = "author_id")
})
public class ForumPost {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ForumBoard board;
    
    @Column(nullable = false, length = 200)
    private String title;
    
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String content;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;
    
    /** 关联团队（找队友帖可选挂靠团队） */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "team_id")
    private Team team;
    
    /** 关联竞赛（经验帖/问答可挂竞赛标签） */
    @Column(name = "competition_id")
    private Long competitionId;
    
    @Column(name = "view_count")
    private Integer viewCount;
    
    @Column(name = "reply_count")
    private Integer replyCount;
    
    @Column(name = "like_count")
    private Integer likeCount;
    
    @Column(name = "favorite_count")
    private Integer favoriteCount;
    
    /** 精华帖(管理员设置) */
    @Column(name = "essence")
    private Boolean essence;
    
    /** 置顶帖(管理员设置) */
    @Column(name = "pinned")
    private Boolean pinned;
    
    /** 当前用户是否点赞(非持久化,接口返回用) */
    @Transient
    private Boolean liked;
    
    /** 当前用户是否收藏(非持久化,接口返回用) */
    @Transient
    private Boolean favorited;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (viewCount == null) viewCount = 0;
        if (replyCount == null) replyCount = 0;
        if (likeCount == null) likeCount = 0;
        if (favoriteCount == null) favoriteCount = 0;
        if (essence == null) essence = false;
        if (pinned == null) pinned = false;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /** 论坛板块 */
    public enum ForumBoard {
        TEAM_FIND("找队友"),
        Q_AND_A("竞赛问答"),
        EXPERIENCE("经验分享"),
        GENERAL("综合交流");
        
        private final String description;
        ForumBoard(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
}
