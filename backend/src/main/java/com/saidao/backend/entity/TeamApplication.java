package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 入队申请实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "team_applications", indexes = {
    @Index(name = "idx_ta_team", columnList = "team_id"),
    @Index(name = "idx_ta_user", columnList = "user_id"),
    @Index(name = "idx_ta_status", columnList = "status")
})
public class TeamApplication {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    /** 申请留言 */
    @Column(length = 500)
    private String message;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApplicationStatus status;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = ApplicationStatus.PENDING;
    }
    
    public enum ApplicationStatus {
        PENDING("待审批"),
        APPROVED("已通过"),
        REJECTED("已拒绝");
        
        private final String description;
        ApplicationStatus(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
}
