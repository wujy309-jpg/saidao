package com.saidao.backend.entity;

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
        ACCEPTED("采纳了你的回复"),
        MENTION("@提及了你"),
        REPORT_RESULT("举报处理结果"),
        TEAM_APPLY("有新的团队申请"),
        TEAM_APPROVED("你的团队申请已通过"),
        TEAM_REJECTED("你的团队申请已拒绝"),
        TEAM_REMOVED("你已被移出团队"),
        TEAM_DISBANDED("团队已解散"),
        TEAM_TRANSFER("团队队长已变更"),
        TOKEN_LOW("Token 余额不足"),
        RECHARGE_PAID("充值已到账"),
        SYSTEM("系统通知");

        private final String description;
        NotificationType(String description) { this.description = description; }
        public String getDescription() { return description; }
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private NotificationType type;

    /** 触发者(可为空) */
    @Column(name = "actor_id")
    private Long actorId;

    /** 触发者昵称(冗余存储,避免通知列表 N+1 查询) */
    @Column(name = "actor_name", length = 50)
    private String actorName;

    @Column(name = "post_id")
    private Long postId;

    @Column(name = "reply_id")
    private Long replyId;

    /** 团队事件关联，论坛通知仍可保持为空。 */
    @Column(name = "team_id")
    private Long teamId;

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
