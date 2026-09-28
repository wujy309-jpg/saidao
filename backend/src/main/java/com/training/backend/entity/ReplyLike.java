package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 回复点赞
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "reply_likes", uniqueConstraints = {
    @UniqueConstraint(name = "uk_reply_like", columnNames = {"reply_id", "user_id"})
})
public class ReplyLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reply_id", nullable = false)
    private Long replyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
