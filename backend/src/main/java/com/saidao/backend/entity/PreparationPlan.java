package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 备赛计划实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "preparation_plans", indexes = {
    @Index(name = "idx_pp_user", columnList = "user_id"),
    @Index(name = "idx_pp_competition", columnList = "competition_id"),
    @Index(name = "idx_pp_created", columnList = "created_at")
})
public class PreparationPlan {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "competition_id", nullable = false)
    private Long competitionId;
    
    @Column(name = "competition_name", nullable = false, length = 200)
    private String competitionName;
    
    /** 计划标题（如：备赛计划 · 数学建模） */
    @Column(length = 200)
    private String title;
    
    /** 计划总览/说明 */
    @Column(columnDefinition = "TEXT")
    private String overview;
    
    /** 参赛目标:冲奖/稳完赛/体验 */
    @Column(length = 20)
    private String goal;
    
    /** 每周可投入小时数 */
    @Column(name = "weekly_hours")
    private Integer weeklyHours;
    
    /** 生成时的现状盘点(已完成项,顿号分隔) */
    @Column(columnDefinition = "TEXT")
    private String baseline;
    
    /** 计划开始日 */
    @Column(name = "start_date")
    private LocalDate startDate;
    
    /** 计划结束日(比赛/截止日) */
    @Column(name = "end_date")
    private LocalDate endDate;
    
    /** 比赛/截止时间原文(展示用) */
    @Column(name = "target_date", length = 50)
    private String targetDate;
    
    /** 阶段元信息 JSON:[{title,reason,startDate,endDate}] */
    @Column(name = "phase_info", columnDefinition = "TEXT")
    private String phaseInfo;
    
    /** 任务总数（冗余，方便列表展示进度） */
    @Column(name = "task_count")
    private Integer taskCount;
    
    /** 已完成任务数 */
    @Column(name = "done_count")
    private Integer doneCount;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (taskCount == null) taskCount = 0;
        if (doneCount == null) doneCount = 0;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
