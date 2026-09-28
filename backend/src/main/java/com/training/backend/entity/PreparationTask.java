package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 备赛计划任务实体（可打卡）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "preparation_tasks", indexes = {
    @Index(name = "idx_pt_plan", columnList = "plan_id")
})
public class PreparationTask {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "plan_id", nullable = false)
    private PreparationPlan plan;
    
    /** 阶段标题（如：第1-2周 · 基础巩固） */
    @Column(name = "phase_title", nullable = false, length = 100)
    private String phaseTitle;
    
    @Column(nullable = false, length = 200)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    /** 建议完成日期(倒排) */
    @Column(name = "due_date")
    private LocalDate dueDate;
    
    /** 预估耗时(小时) */
    @Column(name = "estimated_hours")
    private Integer estimatedHours;
    
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
    
    @Column(nullable = false)
    private Boolean done;
    
    @Column(name = "done_at")
    private LocalDateTime doneAt;
    
    @PrePersist
    protected void onCreate() {
        if (done == null) done = false;
    }
}
