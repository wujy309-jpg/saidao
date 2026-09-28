package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 竞赛收藏实体（升级为"我的竞赛"：带参赛状态）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "favorites", indexes = {
    @Index(name = "idx_fav_user", columnList = "user_id"),
    @Index(name = "idx_fav_user_comp", columnList = "user_id, competition_id", unique = true)
})
public class Favorite {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "competition_id", nullable = false)
    private Long competitionId;
    
    /** 参赛状态：关注/已报名/备赛中/已完赛/获奖 */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JourneyStatus status;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = JourneyStatus.WATCHING;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum JourneyStatus {
        WATCHING("关注"),
        REGISTERED("已报名"),
        PREPARING("备赛中"),
        COMPLETED("已完赛"),
        AWARDED("获奖");
        
        private final String description;
        JourneyStatus(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
}
