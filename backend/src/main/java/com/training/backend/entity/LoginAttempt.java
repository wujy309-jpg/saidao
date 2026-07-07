package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_attempts", indexes = {
    @Index(name = "idx_login_attempt_username", columnList = "username"),
    @Index(name = "idx_login_attempt_ip", columnList = "ipAddress")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginAttempt {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String username;
    
    @Column(length = 45)
    private String ipAddress;
    
    @Column(nullable = false)
    private Boolean success;
    
    @Column(length = 500)
    private String failureReason;
    
    @Column(nullable = false)
    private LocalDateTime attemptTime;
    
    @PrePersist
    protected void onCreate() {
        attemptTime = LocalDateTime.now();
    }
}
