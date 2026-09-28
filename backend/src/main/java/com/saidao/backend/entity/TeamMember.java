package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 团队成员实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "team_members", indexes = {
    @Index(name = "idx_tm_team", columnList = "team_id"),
    @Index(name = "idx_tm_user", columnList = "user_id"),
    @Index(name = "idx_tm_team_user", columnList = "team_id, user_id", unique = true)
})
public class TeamMember {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TeamRole role;
    
    @Column(name = "joined_at")
    private LocalDateTime joinedAt;
    
    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
        if (role == null) role = TeamRole.MEMBER;
    }
    
    public enum TeamRole {
        LEADER("队长"),
        MEMBER("队员");
        
        private final String description;
        TeamRole(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
}
