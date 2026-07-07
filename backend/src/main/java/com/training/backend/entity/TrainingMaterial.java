package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 实训材料实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "training_materials")
public class TrainingMaterial {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 200)
    private String title;
    
    @Column(length = 1000)
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "material_type", nullable = false)
    private MaterialType materialType;
    
    @Column(name = "file_name", nullable = false)
    private String fileName;
    
    @Column(name = "file_path", nullable = false)
    private String filePath;
    
    @Column(name = "file_size")
    private Long fileSize;
    
    @Column(name = "file_type", length = 50)
    private String fileType;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;
    
    @Column(name = "version", length = 20)
    private String version;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private MaterialStatus status;
    
    @Column(name = "ai_score")
    private Integer aiScore;
    
    @Column(name = "ai_feedback", length = 2000)
    private String aiFeedback;
    
    @Column(name = "reviewed_by")
    private Long reviewedBy;
    
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;
    
    @Column(name = "review_comment", length = 1000)
    private String reviewComment;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = MaterialStatus.SUBMITTED;
        }
        if (version == null) {
            version = "1.0";
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /**
     * 材料类型枚举
     */
    public enum MaterialType {
        CODE("代码"),
        REQUIREMENT_DOC("需求文档"),
        DESIGN_DOC("设计文档"),
        TEST_DOC("测试文档"),
        PROJECT_REPORT("项目报告"),
        OTHER("其他");
        
        private final String description;
        
        MaterialType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * 材料状态枚举
     */
    public enum MaterialStatus {
        SUBMITTED("已提交"),
        AI_REVIEWING("AI评审中"),
        AI_REVIEWED("AI已评审"),
        MANUAL_REVIEWING("人工评审中"),
        APPROVED("已通过"),
        REJECTED("已驳回"),
        REVISED("已修改");
        
        private final String description;
        
        MaterialStatus(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}
