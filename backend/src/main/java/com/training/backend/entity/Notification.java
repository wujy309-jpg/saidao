package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 站内通知
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notif_user", columnList = "user_id"),
    @Index(name = "idx_notif_read", columnList = "user_id, is_read")
})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 接收者 */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    public enum NotificationType {
        REPLY("回复了你的帖子"),
        LIKE_POST("赞了你的帖子"),
        LIKE_REPLY("赞了你的回复"),
        FOLLOW("关注了你"),
        ESSENCE("你的帖子被设为精华"),
        ACCEPTED("采纳了你的回复");

        private final String description;
        NotificationType(String description) { this.description = description; }
        public String getDescription() { return description; }
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationType type;

    /** 触发者(可为空) */
    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "post_id")
    private Long postId;

    @Column(name = "reply_id")
    private Long replyId;

    /** 摘要文本(如帖子标题) */
    @Column(length = 120)
    private String summary;

    @Column(name = "is_read", nullable = false)
    private Boolean read = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
