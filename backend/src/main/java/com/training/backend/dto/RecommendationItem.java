package com.training.backend.dto;

import com.training.backend.entity.Competition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * 推荐结果条目
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationItem {
    
    private Long competitionId;
    private String name;
    private Competition.CompetitionCategory category;
    private Competition.CompetitionLevel level;
    private Competition.CompetitionFormat format;
    private Integer teamSizeMax;
    private String organizer;
    private LocalDate registrationEnd;
    private String competitionDate;
    private Integer difficulty;
    private Integer prestige;
    private List<String> tags;
    private String description;
    private String officialUrl;
    private String catalogList;
    private Boolean baoyanBonus;
    private String entryFee;
    private Integer matchScore;
    private String reason;
    private Boolean favorited;
    
    /** 五维匹配度拆解（0-100） */
    private Integer disciplineScore;
    private Integer gradeScore;
    private Integer difficultyScore;
    private Integer timeScore;
    private Integer goalScore;
}
