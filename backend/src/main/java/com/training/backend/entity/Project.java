package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 项目实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "projects")
public class Project {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 200)
    private String name;
    
    @Column(length = 2000)
    private String description;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
    
    @Column(name = "start_date")
    private LocalDate startDate;
    
    @Column(name = "end_date")
    private LocalDate endDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ProjectStatus status;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "current_phase")
    private ProjectPhase currentPhase;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Task> tasks;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ProjectStatus.PLANNING;
        }
        if (currentPhase == null) {
            currentPhase = ProjectPhase.INITIALIZATION;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /**
     * 项目状态枚举
     */
    public enum ProjectStatus {
        PLANNING("规划中"),
        IN_PROGRESS("进行中"),
        ON_HOLD("已暂停"),
        COMPLETED("已完成"),
        CANCELLED("已取消");
        
        private final String description;
        
        ProjectStatus(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * 项目阶段枚举（参考DevOps流程）
     */
    public enum ProjectPhase {
        INITIALIZATION("项目初始化"),
        REQUIREMENTS("需求分析"),
        DESIGN("系统设计"),
        DEVELOPMENT("开发实现"),
        TESTING("测试验证"),
        DEPLOYMENT("部署上线"),
        MAINTENANCE("运维维护");
        
        private final String description;
        
        ProjectPhase(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}
