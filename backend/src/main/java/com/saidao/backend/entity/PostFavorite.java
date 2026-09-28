package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 帖子收藏
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "post_favorites", uniqueConstraints = {
    @UniqueConstraint(name = "uk_post_fav", columnNames = {"post_id", "user_id"})
})
public class PostFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
