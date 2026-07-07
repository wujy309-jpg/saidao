package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 学习路径实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "learning_paths")
public class LearningPath {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student; // 学生
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project; // 关联项目
    
    @Column(name = "path_name", nullable = false, length = 100)
    private String pathName; // 路径名称
    
    @Column(length = 1000)
    private String description; // 路径描述
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private PathStatus status; // 状态
    
    @Column(name = "estimated_duration")
    private Integer estimatedDuration; // 预计时长（小时）
    
    @Column(name = "actual_duration")
    private Integer actualDuration; // 实际时长（小时）
    
    @OneToMany(mappedBy = "learningPath", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("order ASC")
    private List<LearningStep> steps; // 学习步骤
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = PathStatus.NOT_STARTED;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /**
     * 路径状态枚举
     */
    public enum PathStatus {
        NOT_STARTED("未开始"),
        IN_PROGRESS("进行中"),
        COMPLETED("已完成"),
        PAUSED("已暂停");
        
        private final String description;
        
        PathStatus(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}