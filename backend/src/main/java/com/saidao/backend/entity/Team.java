package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 团队实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "teams", indexes = {
    @Index(name = "idx_team_recruiting", columnList = "recruiting"),
    @Index(name = "idx_team_name", columnList = "name")
})
public class Team {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    /** 团队口号 */
    @Column(length = 200)
    private String slogan;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    /** 队长 */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "leader_id", nullable = false)
    private User leader;
    
    /** 是否招募中 */
    @Column(nullable = false)
    private Boolean recruiting;
    
    /** 人数上限 */
    @Column(name = "size_limit", nullable = false)
    private Integer sizeLimit;
    
    /** 目标竞赛名称（选填） */
    @Column(name = "target_competition", length = 200)
    private String targetCompetition;
    
    @Column(name = "member_count")
    private Integer memberCount;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (recruiting == null) recruiting = true;
        if (sizeLimit == null) sizeLimit = 5;
        if (memberCount == null) memberCount = 0;
    }
}
