package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_activities", indexes = {
    @Index(name = "idx_activity_task", columnList = "taskId"),
    @Index(name = "idx_activity_created", columnList = "createdAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskActivity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long taskId;
    
    @Column(nullable = false)
    private Long userId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType type;
    
    @Column(length = 500)
    private String description;
    
    @Column(length = 500)
    private String oldValue;
    
    @Column(length = 500)
    private String newValue;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum ActivityType {
        CREATED,
        STATUS_CHANGED,
        ASSIGNED,
        COMMENT_ADDED,
        FILE_UPLOADED,
        MENTION,
        PRIORITY_CHANGED,
        DUE_DATE_CHANGED,
        COMPLETED
    }
}
