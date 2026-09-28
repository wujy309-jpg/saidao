package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_user_id", columnList = "userId"),
    @Index(name = "idx_audit_action", columnList = "action"),
    @Index(name = "idx_audit_created_at", columnList = "createdAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;
    
    @Column(nullable = false, length = 50)
    private String username;
    
    @Column(nullable = false, length = 100)
    private String action;
    
    @Column(length = 50)
    private String resourceType;
    
    private Long resourceId;
    
    @Column(length = 500)
    private String details;
    
    @Column(length = 45)
    private String ipAddress;
    
    @Column(length = 500)
    private String userAgent;
    
    @Column(nullable = false)
    private Boolean success;
    
    @Column(length = 1000)
    private String errorMessage;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
