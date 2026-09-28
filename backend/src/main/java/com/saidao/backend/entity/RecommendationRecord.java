package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 推荐记录实体 - 保存每次推荐的结果
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "recommendation_records", indexes = {
    @Index(name = "idx_rec_user", columnList = "user_id"),
    @Index(name = "idx_rec_competition", columnList = "competition_id"),
    @Index(name = "idx_rec_created", columnList = "created_at")
})
public class RecommendationRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "competition_id", nullable = false)
    private Long competitionId;
    
    @Column(name = "competition_name", length = 200)
    private String competitionName;
    
    @Column(name = "match_score", nullable = false)
    private Integer matchScore;
    
    /** 五维匹配度（0-100）：学科/年级/难度/时间/目标 */
    @Column(name = "discipline_score")
    private Integer disciplineScore;
    
    @Column(name = "grade_score")
    private Integer gradeScore;
    
    @Column(name = "difficulty_score")
    private Integer difficultyScore;
    
    @Column(name = "time_score")
    private Integer timeScore;
    
    @Column(name = "goal_score")
    private Integer goalScore;
    
    @Column(columnDefinition = "TEXT")
    private String reason;
    
    /** 用户反馈：LIKE / DISLIKE / null */
    @Column(length = 20)
    private String feedback;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
