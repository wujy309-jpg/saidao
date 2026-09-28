package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 历年优秀作品实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "excellent_works", indexes = {
    @Index(name = "idx_ew_competition", columnList = "competition_id"),
    @Index(name = "idx_ew_year", columnList = "work_year")
})
public class ExcellentWork {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "competition_id", nullable = false)
    private Long competitionId;
    
    @Column(name = "competition_name", nullable = false, length = 200)
    private String competitionName;
    
    /** 作品标题 */
    @Column(nullable = false, length = 300)
    private String title;
    
    /** 作品简介 */
    @Column(columnDefinition = "TEXT")
    private String description;
    
    /** 年份，如 2024（year 为 H2 保留字，列名用 work_year） */
    @Column(name = "work_year")
    private Integer year;
    
    /** 奖项：特等奖/一等奖/金奖/Outstanding 等 */
    @Column(length = 50)
    private String award;
    
    /** 团队/作者/学校 */
    @Column(length = 200)
    private String team;
    
    /** 作品类型：论文/项目/视频/作品 */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkType type;
    
    /** 查看链接 */
    @Column(length = 500)
    private String link;
    
    @Column(name = "sort_order")
    private Integer sortOrder;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (sortOrder == null) sortOrder = 0;
    }
    
    public enum WorkType {
        PAPER("论文"),
        PROJECT("项目"),
        VIDEO("视频"),
        ARTWORK("作品");
        
        private final String description;
        WorkType(String description) { this.description = description; }
        public String getDescription() { return description; }
    }
}
