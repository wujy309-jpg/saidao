package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 竞赛反馈实体（喜欢/不感兴趣），用于推荐闭环调权
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "competition_feedbacks", indexes = {
    @Index(name = "idx_cf_user", columnList = "user_id"),
    @Index(name = "idx_cf_user_comp", columnList = "user_id, competition_id", unique = true)
})
public class CompetitionFeedback {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "competition_id", nullable = false)
    private Long competitionId;
    
    /** LIKE / DISLIKE */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FeedbackAction action;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum FeedbackAction {
        LIKE("喜欢"),
        DISLIKE("不感兴趣");
        
        private final String description;
        FeedbackAction(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
}
