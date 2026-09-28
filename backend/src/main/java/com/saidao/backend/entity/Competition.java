package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 竞赛实体 - 竞赛库
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "competitions", indexes = {
    @Index(name = "idx_comp_category", columnList = "category"),
    @Index(name = "idx_comp_level", columnList = "level"),
    @Index(name = "idx_comp_status", columnList = "status")
})
public class Competition {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 200)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CompetitionCategory category;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "competition_disciplines", joinColumns = @JoinColumn(name = "competition_id"))
    @Column(name = "discipline", length = 50)
    private List<String> disciplines;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompetitionLevel level;
    
    @Column(length = 200)
    private String organizer;
    
    @Column(name = "registration_start")
    private LocalDate registrationStart;
    
    @Column(name = "registration_end")
    private LocalDate registrationEnd;
    
    @Column(name = "competition_date", length = 50)
    private String competitionDate;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompetitionFormat format;
    
    @Column(name = "team_size_max")
    private Integer teamSizeMax;
    
    @Column(nullable = false)
    private Integer difficulty;
    
    @Column(nullable = false)
    private Integer prestige;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "competition_grades", joinColumns = @JoinColumn(name = "competition_id"))
    @Column(name = "grade")
    private List<Integer> suitableGrades;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "competition_tags", joinColumns = @JoinColumn(name = "competition_id"))
    @Column(name = "tag", length = 50)
    private List<String> tags;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "official_url", length = 300)
    private String officialUrl;
    
    /** 竞赛目录：教育部竞赛目录 / 高教学会榜单 / 省级重点 / 其他（筛选用） */
    @Column(name = "catalog_list", length = 30)
    private String catalogList;
    
    /** 保研加分：是否对保研综测有加分价值 */
    @Column(name = "baoyan_bonus")
    private Boolean baoyanBonus;
    
    /** 报名费：免费 / 低 / 中 / 高 或具体说明 */
    @Column(name = "entry_fee", length = 50)
    private String entryFee;
    
    /** 赛制规则与评审标准（整理自官网，AI 助手上下文） */
    @Column(name = "rules", columnDefinition = "TEXT")
    private String rules;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompetitionStatus status;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = CompetitionStatus.ACTIVE;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /** 竞赛类别：工科/理科/文科/综合 */
    public enum CompetitionCategory {
        ENGINEERING("工科"),
        SCIENCE("理科"),
        LIBERAL_ARTS("文科"),
        COMPREHENSIVE("综合");
        
        private final String description;
        CompetitionCategory(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
    
    /** 竞赛级别 */
    public enum CompetitionLevel {
        SCHOOL("校级"),
        PROVINCIAL("省级"),
        NATIONAL("国家级"),
        INTERNATIONAL("国际级");
        
        private final String description;
        CompetitionLevel(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
    
    /** 竞赛形式：个人赛/团队赛 */
    public enum CompetitionFormat {
        INDIVIDUAL("个人赛"),
        TEAM("团队赛");
        
        private final String description;
        CompetitionFormat(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
    
    /** 竞赛状态 */
    public enum CompetitionStatus {
        ACTIVE("进行中"),
        CLOSED("已结束");
        
        private final String description;
        CompetitionStatus(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
}
