package com.training.backend.dto;

import com.training.backend.entity.Competition;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * 竞赛创建/更新请求（管理员）
 */
@Data
public class CompetitionRequest {
    
    private String name;
    private Competition.CompetitionCategory category;
    private List<String> disciplines;
    private Competition.CompetitionLevel level;
    private String organizer;
    private LocalDate registrationStart;
    private LocalDate registrationEnd;
    private String competitionDate;
    private Competition.CompetitionFormat format;
    private Integer teamSizeMax;
    private Integer difficulty;
    private Integer prestige;
    private List<Integer> suitableGrades;
    private List<String> tags;
    private String description;
    private String officialUrl;
    private String catalogList;
    private Boolean baoyanBonus;
    private String entryFee;
    private String rules;
    private Competition.CompetitionStatus status;
}
