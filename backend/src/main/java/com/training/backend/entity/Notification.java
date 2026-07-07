package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 通知实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notifications")
public class Notification {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;
    
    @Column(nullable = false, length = 200)
    private String title;
    
    @Column(nullable = false, length = 1000)
    private String content;
    
    @Column(name = "is_read")
    private Boolean isRead;
    
    @Column(name = "related_id")
    private Long relatedId; // 关联的业务ID
    
    @Column(name = "related_type", length = 50)
    private String relatedType; // 关联的业务类型
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isRead == null) {
            isRead = false;
        }
    }
    
    /**
     * 通知类型枚举
     */
    public enum NotificationType {
        TASK("任务通知"),
        EVALUATION("评价通知"),
        RECORD("记录通知"),
        SYSTEM("系统通知"),
        WARNING("警告通知"),
        SUCCESS("成功通知");
        
        private final String description;
        
        NotificationType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}
