package com.saidao.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saidao.backend.dto.RecommendationItem;
import com.saidao.backend.dto.RecommendationResponse;
import com.saidao.backend.entity.Competition;
import com.saidao.backend.entity.CompetitionFeedback;
import com.saidao.backend.entity.RecommendationRecord;
import com.saidao.backend.entity.UserProfile;
import com.saidao.backend.repository.CompetitionFeedbackRepository;
import com.saidao.backend.repository.CompetitionRepository;
import com.saidao.backend.repository.FavoriteRepository;
import com.saidao.backend.repository.RecommendationRecordRepository;
import com.saidao.backend.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 竞赛推荐服务：五维规则评分 + 行为反馈调权 + DeepSeek 大模型精排
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {
    
    private final UserProfileRepository profileRepository;
    private final CompetitionRepository competitionRepository;
    private final RecommendationRecordRepository recordRepository;
    private final FavoriteRepository favoriteRepository;
    private final CompetitionFeedbackRepository feedbackRepository;
    private final DeepSeekService deepSeekService;
    private final ObjectMapper objectMapper;
    
    private static final int CANDIDATE_COUNT = 25;
    private static final int RESULT_COUNT = 8;
    
    /**
     * 生成推荐
     */
    @Transactional
    public RecommendationResponse generate(Long userId) {
        UserProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("请先完成画像问卷"));
        
        // 用户历史反馈：喜欢 + 权重，不感兴趣直接排除
        Map<Long, CompetitionFeedback.FeedbackAction> feedbackMap = new HashMap<>();
        List<Long> dislikedIds = new ArrayList<>();
        feedbackRepository.findByUserId(userId).forEach(f -> {
            feedbackMap.put(f.getCompetitionId(), f.getAction());
            if (f.getAction() == CompetitionFeedback.FeedbackAction.DISLIKE) {
                dislikedIds.add(f.getCompetitionId());
            }
        });
        
        List<Competition> active = competitionRepository.findAll().stream()
                .filter(c -> c.getStatus() == Competition.CompetitionStatus.ACTIVE)
                .filter(c -> !dislikedIds.contains(c.getId()))
                .collect(Collectors.toList());
        
        if (active.isEmpty()) {
            throw new IllegalStateException("竞赛库为空，请联系管理员");
        }
        
        // 1. 五维规则评分
        List<Map.Entry<Competition, MatchScores>> ranked = active.stream()
                .map(c -> Map.entry(c, computeScores(c, profile, feedbackMap)))
                .sorted((a, b) -> Integer.compare(b.getValue().total, a.getValue().total))
                .limit(CANDIDATE_COUNT)
                .collect(Collectors.toList());
        
        Map<Long, MatchScores> scoreMap = ranked.stream()
                .collect(Collectors.toMap(e -> e.getKey().getId(), Map.Entry::getValue));
        
        // 2. 大模型精排
        Map<Long, Integer> llmScores = new HashMap<>();
        Map<Long, String> llmReasons = new HashMap<>();
        try {
            callLlm(profile, ranked, llmScores, llmReasons, dislikedIds);
        } catch (Exception e) {
            log.warn("大模型推荐失败，使用规则推荐兜底: {}", e.getMessage());
        }
        
        boolean llmOk = !llmScores.isEmpty();
        
        // 3. 组装结果：LLM 结果优先，规则兜底
        List<Map.Entry<Competition, Integer>> finalList = new ArrayList<>();
        if (llmOk) {
            llmScores.entrySet().stream()
                    .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
                    .forEach(e -> ranked.stream()
                            .filter(r -> r.getKey().getId().equals(e.getKey()))
                            .findFirst()
                            .ifPresent(r -> finalList.add(Map.entry(r.getKey(), e.getValue()))));
        } else {
            finalList.addAll(ranked.stream()
                    .limit(RESULT_COUNT)
                    .map(r -> Map.entry(r.getKey(), r.getValue().total))
                    .collect(Collectors.toList()));
        }
        
        if (finalList.isEmpty()) {
            finalList.addAll(ranked.stream().limit(RESULT_COUNT)
                    .map(r -> Map.entry(r.getKey(), r.getValue().total))
                    .collect(Collectors.toList()));
        }
        
        // 4. 清理旧记录并落库
        recordRepository.deleteByUserId(userId);
        
        List<RecommendationItem> items = finalList.stream().limit(RESULT_COUNT).map(entry -> {
            Competition c = entry.getKey();
            int score = entry.getValue();
            String reason = llmReasons.getOrDefault(c.getId(), buildFallbackReason(c, profile));
            MatchScores dims = scoreMap.getOrDefault(c.getId(), MatchScores.zero());
            
            RecommendationRecord record = new RecommendationRecord();
            record.setUserId(userId);
            record.setCompetitionId(c.getId());
            record.setCompetitionName(c.getName());
            record.setMatchScore(score);
            record.setDisciplineScore(dims.discipline);
            record.setGradeScore(dims.grade);
            record.setDifficultyScore(dims.difficulty);
            record.setTimeScore(dims.time);
            record.setGoalScore(dims.goal);
            record.setReason(reason);
            recordRepository.save(record);
            
            return toItem(c, score, reason, dims, userId);
        }).collect(Collectors.toList());
        
        return RecommendationResponse.builder()
                .items(items)
                .generatedAt(LocalDateTime.now())
                .profileSummary(buildProfileSummary(profile))
                .build();
    }
    
    /** 推荐历史 */
    public List<RecommendationItem> history(Long userId) {
        return recordRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(record -> {
            Competition c = competitionRepository.findById(record.getCompetitionId()).orElse(null);
            MatchScores dims = MatchScores.of(record.getDisciplineScore(), record.getGradeScore(),
                    record.getDifficultyScore(), record.getTimeScore(), record.getGoalScore());
            if (c == null) {
                return RecommendationItem.builder()
                        .competitionId(record.getCompetitionId())
                        .name(record.getCompetitionName())
                        .matchScore(record.getMatchScore())
                        .reason(record.getReason())
                        .disciplineScore(record.getDisciplineScore())
                        .gradeScore(record.getGradeScore())
                        .difficultyScore(record.getDifficultyScore())
                        .timeScore(record.getTimeScore())
                        .goalScore(record.getGoalScore())
                        .build();
            }
            return toItem(c, record.getMatchScore(), record.getReason(), dims, userId);
        }).collect(Collectors.toList());
    }
    
    @Transactional
    public boolean feedback(Long userId, Long recordId, String feedback) {
        Optional<RecommendationRecord> opt = recordRepository.findById(recordId);
        if (opt.isEmpty() || !opt.get().getUserId().equals(userId)) return false;
        RecommendationRecord record = opt.get();
        record.setFeedback(feedback);
        recordRepository.save(record);
        return true;
    }
    
    // ============ 五维规则评分 ============
    
    /**
     * 计算五维匹配度：学科 / 年级 / 难度 / 时间 / 目标（各 0-100），total 为加权总分
     */
    private MatchScores computeScores(Competition c, UserProfile p,
                                      Map<Long, CompetitionFeedback.FeedbackAction> feedbackMap) {
        // 学科匹配
        int discipline = 50;
        Set<Competition.CompetitionCategory> matched = disciplineCategories(p.getDiscipline());
        if (matched.contains(c.getCategory())) discipline = 100;
        else {
            // 学科标签部分重合
            Set<String> compDisciplines = new HashSet<>();
            if (c.getDisciplines() != null) compDisciplines.addAll(c.getDisciplines());
            Set<String> profileKeywords = new HashSet<>();
            if (p.getInterests() != null) profileKeywords.addAll(p.getInterests());
            if (p.getSkills() != null) profileKeywords.addAll(p.getSkills());
            long overlap = profileKeywords.stream().filter(k ->
                    compDisciplines.stream().anyMatch(cd -> cd.contains(k) || k.contains(cd))).count();
            if (overlap > 0) discipline = 70;
        }
        
        // 年级匹配
        int grade = 50;
        if (c.getSuitableGrades() != null && p.getGrade() != null) {
            if (c.getSuitableGrades().contains(p.getGrade())) grade = 100;
            else {
                // 距离适合年级的远近
                int minDiff = c.getSuitableGrades().stream()
                        .mapToInt(g -> Math.abs(g - p.getGrade())).min().orElse(4);
                grade = Math.max(20, 100 - minDiff * 20);
            }
        }
        
        // 难度匹配：经验 + 时间 vs 难度
        int difficulty = 60;
        if (c.getDifficulty() != null) {
            if (Boolean.TRUE.equals(p.getHasExperience())) {
                difficulty = 100 - Math.abs(c.getDifficulty() - 4) * 10; // 老手偏好 4-5 难
            } else {
                difficulty = 100 - Math.abs(c.getDifficulty() - 2) * 12; // 新手偏好 2-3 难
            }
            difficulty = Math.max(10, Math.min(100, difficulty));
        }
        
        // 时间匹配：每周可投入 vs 竞赛难度对应的预期投入
        int time = 60;
        if (p.getWeeklyHours() != null && c.getDifficulty() != null) {
            int expected = c.getDifficulty() * 3; // 预期每周投入小时数（粗略）
            int diff = Math.abs(p.getWeeklyHours() - expected);
            time = diff <= 1 ? 100 : diff <= 3 ? 85 : diff <= 6 ? 60 : 35;
        }
        
        // 目标匹配
        int goal = 60;
        if (p.getGoals() != null && !p.getGoals().isEmpty()) {
            boolean needPrestige = p.getGoals().stream()
                    .anyMatch(g -> g.contains("保研") || g.contains("求职") || g.contains("简历") || g.contains("出国"));
            boolean wantAward = p.getGoals().stream().anyMatch(g -> g.contains("获奖"));
            if (needPrestige && c.getPrestige() != null) {
                goal = c.getPrestige() >= 5 ? 100 : c.getPrestige() >= 4 ? 85 : c.getPrestige() >= 3 ? 60 : 40;
            } else if (wantAward && c.getDifficulty() != null) {
                goal = c.getDifficulty() <= 3 ? 90 : 70; // 求获奖 → 偏好难度适中的
            }
        }
        if (p.getPreferredLevel() != null && !p.getPreferredLevel().isBlank()
                && c.getLevel().name().equalsIgnoreCase(p.getPreferredLevel())) {
            goal = Math.min(100, goal + 10);
        }
        
        // 兴趣/技能关键词重叠加成（并入学科维度）
        Set<String> keywords = new HashSet<>();
        if (p.getInterests() != null) keywords.addAll(p.getInterests());
        if (p.getSkills() != null) keywords.addAll(p.getSkills());
        if (!keywords.isEmpty()) {
            Set<String> compKeywords = new HashSet<>();
            if (c.getTags() != null) compKeywords.addAll(c.getTags());
            if (c.getDisciplines() != null) compKeywords.addAll(c.getDisciplines());
            long overlap = keywords.stream().filter(k ->
                    compKeywords.stream().anyMatch(ck -> ck.contains(k) || k.contains(ck))).count();
            if (overlap > 0) discipline = Math.min(100, discipline + (int) Math.min(20, overlap * 8));
        }
        
        MatchScores scores = MatchScores.of(discipline, grade, difficulty, time, goal);
        
        // 行为反馈调权：喜欢 +8，不感兴趣已在过滤层排除
        CompetitionFeedback.FeedbackAction action = feedbackMap.get(c.getId());
        if (action == CompetitionFeedback.FeedbackAction.LIKE) {
            scores.total = Math.min(100, scores.total + 8);
        }
        
        return scores;
    }
    
    private Set<Competition.CompetitionCategory> disciplineCategories(String discipline) {
        if (discipline == null) return Set.of(Competition.CompetitionCategory.COMPREHENSIVE);
        return switch (discipline) {
            case "工科" -> Set.of(Competition.CompetitionCategory.ENGINEERING, Competition.CompetitionCategory.COMPREHENSIVE);
            case "理科" -> Set.of(Competition.CompetitionCategory.SCIENCE, Competition.CompetitionCategory.COMPREHENSIVE);
            case "文科" -> Set.of(Competition.CompetitionCategory.LIBERAL_ARTS, Competition.CompetitionCategory.COMPREHENSIVE);
            default -> Set.of(Competition.CompetitionCategory.COMPREHENSIVE);
        };
    }
    
    // ============ 大模型调用 ============
    
    private void callLlm(UserProfile profile, List<Map.Entry<Competition, MatchScores>> ranked,
                         Map<Long, Integer> scores, Map<Long, String> reasons,
                         List<Long> dislikedIds) throws Exception {
        StringBuilder candidates = new StringBuilder();
        for (Map.Entry<Competition, MatchScores> e : ranked) {
            Competition c = e.getKey();
            candidates.append(String.format(
                    "- id=%d | %s | 类别:%s | 级别:%s | 形式:%s | 难度:%d/5 | 含金量:%d/5 | 标签:%s | 报名截止:%s | 简介:%s%n",
                    c.getId(), c.getName(), c.getCategory().getDescription(), c.getLevel().getDescription(),
                    c.getFormat().getDescription(), c.getDifficulty(), c.getPrestige(),
                    c.getTags() == null ? "" : String.join("/", c.getTags()),
                    c.getRegistrationEnd() == null ? "未定" : c.getRegistrationEnd().toString(),
                    c.getDescription() == null ? "" : c.getDescription()
            ));
        }
        
        String systemPrompt = """
                你是大学生竞赛规划专家。根据学生画像和候选竞赛列表，为学生推荐最适合的 6-8 个竞赛。
                要求：
                1. 严格只从候选列表中选择（用候选中的 id 标识）
                2. 充分考虑学生的学科、年级、兴趣、技能、目标和可投入时间
                3. 兼顾挑战性和可行性，难度要与学生情况匹配
                4. 尽量在匹配学科内保持多样性（不同方向/级别）
                5. 只输出 JSON，格式如下，不要输出任何其他文字或代码块标记：
                [{"id": 1, "score": 92, "reason": "推荐理由（不超过40字）"}]
                score 为 0-100 的匹配度整数。
                """;
        
        String userMessage = String.format("""
                学生画像：
                - 学科：%s，专业：%s，年级：%s
                - 兴趣：%s
                - 技能：%s
                - 参赛目标：%s
                - 每周可投入：%s小时，是否有参赛经历：%s，偏好级别：%s
                - 补充描述：%s
                %s
                候选竞赛列表：
                %s
                """,
                profile.getDiscipline(), profile.getMajor() == null ? "未知" : profile.getMajor(),
                gradeLabel(profile.getGrade()),
                profile.getInterests() == null || profile.getInterests().isEmpty() ? "无" : String.join("、", profile.getInterests()),
                profile.getSkills() == null || profile.getSkills().isEmpty() ? "无" : String.join("、", profile.getSkills()),
                profile.getGoals() == null || profile.getGoals().isEmpty() ? "无" : String.join("、", profile.getGoals()),
                profile.getWeeklyHours() == null ? "不限" : profile.getWeeklyHours(),
                Boolean.TRUE.equals(profile.getHasExperience()) ? "有" : "无",
                profile.getPreferredLevel() == null ? "不限" : profile.getPreferredLevel(),
                profile.getDescription() == null ? "无" : profile.getDescription(),
                dislikedIds.isEmpty() ? "" : "- 用户明确表示不感兴趣的竞赛id（已从候选排除）：" + dislikedIds,
                candidates.toString());
        
        String content = deepSeekService.chat(systemPrompt, userMessage);
        if (content == null || content.isBlank()) {
            log.warn("DeepSeek 返回空内容");
            return;
        }
        
        String json = extractJson(content);
        List<Map<String, Object>> list = objectMapper.readValue(json, new TypeReference<>() {});
        for (Map<String, Object> m : list) {
            Object idObj = m.get("id");
            Object scoreObj = m.get("score");
            Object reasonObj = m.get("reason");
            if (idObj == null || scoreObj == null) continue;
            Long id = Long.valueOf(String.valueOf(idObj));
            int score = Math.max(0, Math.min(100, Integer.parseInt(String.valueOf(scoreObj))));
            scores.put(id, score);
            if (reasonObj != null) reasons.put(id, String.valueOf(reasonObj));
        }
    }
    
    private String extractJson(String content) {
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            int start = trimmed.indexOf('[');
            int end = trimmed.lastIndexOf(']');
            if (start >= 0 && end > start) return trimmed.substring(start, end + 1);
        }
        int start = trimmed.indexOf('[');
        int end = trimmed.lastIndexOf(']');
        if (start >= 0 && end > start) return trimmed.substring(start, end + 1);
        return trimmed;
    }
    
    // ============ 工具 ============
    
    private RecommendationItem toItem(Competition c, int score, String reason,
                                      MatchScores dims, Long userId) {
        return RecommendationItem.builder()
                .competitionId(c.getId())
                .name(c.getName())
                .category(c.getCategory())
                .level(c.getLevel())
                .format(c.getFormat())
                .teamSizeMax(c.getTeamSizeMax())
                .organizer(c.getOrganizer())
                .registrationEnd(c.getRegistrationEnd())
                .competitionDate(c.getCompetitionDate())
                .difficulty(c.getDifficulty())
                .prestige(c.getPrestige())
                .tags(c.getTags())
                .description(c.getDescription())
                .officialUrl(c.getOfficialUrl())
                .catalogList(c.getCatalogList())
                .baoyanBonus(c.getBaoyanBonus())
                .entryFee(c.getEntryFee())
                .matchScore(score)
                .reason(reason)
                .favorited(favoriteRepository.existsByUserIdAndCompetitionId(userId, c.getId()))
                .disciplineScore(dims.discipline)
                .gradeScore(dims.grade)
                .difficultyScore(dims.difficulty)
                .timeScore(dims.time)
                .goalScore(dims.goal)
                .build();
    }
    
    /** 五维匹配度 */
    public static class MatchScores {
        public int discipline;
        public int grade;
        public int difficulty;
        public int time;
        public int goal;
        public int total;
        
        private MatchScores(int discipline, int grade, int difficulty, int time, int goal) {
            this.discipline = clamp(discipline);
            this.grade = clamp(grade);
            this.difficulty = clamp(difficulty);
            this.time = clamp(time);
            this.goal = clamp(goal);
            // 加权总分：学科 30% + 年级 15% + 难度 25% + 时间 15% + 目标 15%
            this.total = clamp((int) Math.round(
                    this.discipline * 0.30 + this.grade * 0.15 + this.difficulty * 0.25
                            + this.time * 0.15 + this.goal * 0.15));
        }
        
        public static MatchScores of(Integer discipline, Integer grade, Integer difficulty,
                                     Integer time, Integer goal) {
            return new MatchScores(
                    discipline == null ? 50 : discipline,
                    grade == null ? 50 : grade,
                    difficulty == null ? 50 : difficulty,
                    time == null ? 50 : time,
                    goal == null ? 50 : goal);
        }
        
        public static MatchScores zero() {
            return new MatchScores(0, 0, 0, 0, 0);
        }
        
        private static int clamp(int v) {
            return Math.max(0, Math.min(100, v));
        }
    }
    
    private String buildFallbackReason(Competition c, UserProfile p) {
        String cat = c.getCategory() == null ? "" : c.getCategory().getDescription();
        String base = String.format("该竞赛属于%s类、%s级别", cat,
                c.getLevel() == null ? "" : c.getLevel().getDescription());
        if (c.getSuitableGrades() != null && p.getGrade() != null && c.getSuitableGrades().contains(p.getGrade())) {
            base += "，适合你当前年级";
        }
        if (c.getPrestige() != null && c.getPrestige() >= 4) base += "，含金量高";
        base += "，建议关注报名时间提前准备。";
        return base;
    }
    
    private String buildProfileSummary(UserProfile p) {
        return String.format("%s·%s·%s", 
                p.getDiscipline(), 
                p.getMajor() == null ? "专业未填" : p.getMajor(),
                gradeLabel(p.getGrade()));
    }
    
    private String gradeLabel(Integer grade) {
        if (grade == null) return "未知";
        return switch (grade) {
            case 1 -> "大一";
            case 2 -> "大二";
            case 3 -> "大三";
            case 4 -> "大四";
            case 5 -> "研究生";
            default -> "年级" + grade;
        };
    }
}
