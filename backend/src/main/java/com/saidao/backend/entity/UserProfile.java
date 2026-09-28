package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户画像实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_profiles", indexes = {
    @Index(name = "idx_profile_user", columnList = "user_id", unique = true),
    @Index(name = "idx_profile_discipline", columnList = "discipline"),
    @Index(name = "idx_profile_grade", columnList = "grade")
})
public class UserProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;
    
    /** 学科大类，如：工科/理科/文科/经管/医学/农学/艺术 */
    @Column(length = 50)
    private String discipline;
    
    /** 专业名称 */
    @Column(length = 100)
    private String major;
    
    /** 年级：1=大一 2=大二 3=大三 4=大四 5=研究生 */
    private Integer grade;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "profile_interests", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "interest", length = 50)
    private List<String> interests;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "profile_skills", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "skill", length = 50)
    private List<String> skills;
    
    /** 参赛目标，如：保研加分/求职简历/能力锻炼/出国申请 */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "profile_goals", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "goal", length = 50)
    private List<String> goals;
    
    /** 每周可投入时间（小时） */
    @Column(name = "weekly_hours")
    private Integer weeklyHours;
    
    /** 是否有参赛经历 */
    @Column(name = "has_experience")
    private Boolean hasExperience;
    
    /** 偏好的竞赛级别 */
    @Column(name = "preferred_level", length = 20)
    private String preferredLevel;
    
    /** 自由补充描述 */
    @Column(columnDefinition = "TEXT")
    private String description;
    
    /** 学校(社区信任体系) */
    @Column(length = 100)
    private String school;
    
    /** 获奖履历(每行一条) */
    @Column(name = "achievements", columnDefinition = "TEXT")
    private String achievements;
    
    /** 管理员认证(身份已核验) */
    @Column(name = "verified")
    private Boolean verified;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
        if (verified == null) verified = false;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
