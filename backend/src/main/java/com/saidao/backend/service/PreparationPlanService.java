package com.saidao.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saidao.backend.entity.Competition;
import com.saidao.backend.entity.PreparationPlan;
import com.saidao.backend.entity.PreparationTask;
import com.saidao.backend.entity.UserProfile;
import com.saidao.backend.repository.CompetitionRepository;
import com.saidao.backend.repository.PreparationPlanRepository;
import com.saidao.backend.repository.PreparationTaskRepository;
import com.saidao.backend.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 备赛计划服务:条件化生成(目标/时长/现状盘点)+ 倒排排程 + 阶段理由 + 任务换一个/编辑/删除 + 一句话重排
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PreparationPlanService {
    
    private final PreparationPlanRepository planRepository;
    private final PreparationTaskRepository taskRepository;
    private final CompetitionRepository competitionRepository;
    private final UserProfileRepository profileRepository;
    private final DeepSeekService deepSeekService;
    private final ObjectMapper objectMapper;
    
    private static final String GOAL_DEFAULT = "稳完赛";
    private static final int MAX_TASKS = 12;
    
    // ==================== 生成 ====================
    
    /** 生成备赛计划(已有计划则覆盖重新生成) */
    @Transactional
    public PreparationPlan generate(Long userId, Long competitionId, String goal,
                                    Integer weeklyHours, List<String> completed) {
        Competition c = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new RuntimeException("竞赛不存在"));
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);
        
        String goalText = normalizeGoal(goal);
        int hours = weeklyHours != null && weeklyHours >= 1 && weeklyHours <= 40
                ? weeklyHours
                : (profile != null && profile.getWeeklyHours() != null ? profile.getWeeklyHours() : 8);
        
        // 删除旧的计划
        planRepository.findTopByUserIdAndCompetitionIdOrderByCreatedAtDesc(userId, competitionId)
                .ifPresent(old -> {
                    taskRepository.deleteByPlanId(old.getId());
                    planRepository.delete(old);
                });
        
        PlanContent content = tryLlm(c, profile, goalText, hours, completed);
        if (content == null) {
            content = templatePlan(c, profile, goalText, hours, completed);
        }
        
        // 倒排排程
        LocalDate start = LocalDate.now();
        LocalDate end = resolveTargetDate(c);
        assignDates(content, start, end);
        
        PreparationPlan plan = new PreparationPlan();
        plan.setUserId(userId);
        plan.setCompetitionId(competitionId);
        plan.setCompetitionName(c.getName());
        plan.setTitle(content.title);
        plan.setOverview(content.overview);
        plan.setGoal(goalText);
        plan.setWeeklyHours(hours);
        if (completed != null && !completed.isEmpty()) {
            plan.setBaseline(String.join("、", completed));
        }
        plan.setStartDate(start);
        plan.setEndDate(end);
        plan.setTargetDate(targetDateText(c));
        int total = content.phases.stream().mapToInt(p -> p.tasks.size()).sum();
        plan.setTaskCount(total);
        plan.setDoneCount(0);
        plan.setPhaseInfo(buildPhaseInfoJson(content));
        PreparationPlan saved = planRepository.save(plan);
        
        int order = 0;
        for (PlanPhase phase : content.phases) {
            for (PlanTask t : phase.tasks) {
                PreparationTask task = new PreparationTask();
                task.setPlan(saved);
                task.setPhaseTitle(phase.title);
                task.setTitle(t.title);
                task.setDescription(t.description);
                task.setDueDate(t.dueDate);
                task.setEstimatedHours(t.hours == null ? 2 : t.hours);
                task.setSortOrder(order++);
                task.setDone(false);
                taskRepository.save(task);
            }
        }
        
        log.info("备赛计划生成成功: {} - {} (目标:{}, 每周{}h, {}阶段{}任务)",
                userId, c.getName(), goalText, hours, content.phases.size(), total);
        return saved;
    }
    
    /** 比赛/截止时间展示文案 */
    private String targetDateText(Competition c) {
        if (c.getCompetitionDate() != null && !c.getCompetitionDate().isBlank()) {
            return c.getCompetitionDate();
        }
        if (c.getRegistrationEnd() != null) {
            return c.getRegistrationEnd().toString();
        }
        return "待定";
    }
    
    /** 计划终点:比赛日期优先,其次报名截止,再否则 45 天后 */
    private LocalDate resolveTargetDate(Competition c) {
        LocalDate d = parseDate(c.getCompetitionDate());
        if (d == null) d = c.getRegistrationEnd();
        if (d == null) d = LocalDate.now().plusDays(45);
        if (!d.isAfter(LocalDate.now())) d = LocalDate.now().plusDays(14);
        return d;
    }
    
    private LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            // 支持 2027-08 与 2027-08-15
            if (s.matches("\\d{4}-\\d{1,2}")) {
                String[] p = s.split("-");
                return LocalDate.of(Integer.parseInt(p[0]), Integer.parseInt(p[1]), 1);
            }
            return LocalDate.parse(s.trim());
        } catch (Exception e) {
            return null;
        }
    }
    
    /** 倒排:阶段均分时间段,任务在阶段内均分 */
    private void assignDates(PlanContent content, LocalDate start, LocalDate end) {
        int n = content.phases.size();
        if (n == 0) return;
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(start, end));
        long phaseDays = totalDays / n;
        
        for (int i = 0; i < n; i++) {
            PlanPhase phase = content.phases.get(i);
            LocalDate ps = start.plusDays(phaseDays * i);
            LocalDate pe = i == n - 1 ? end : start.plusDays(phaseDays * (i + 1) - 1);
            if (pe.isBefore(ps)) pe = ps;
            phase.startDate = ps;
            phase.endDate = pe;
            
            int m = phase.tasks.size();
            if (m == 0) continue;
            long span = Math.max(1, ChronoUnit.DAYS.between(ps, pe) + 1);
            for (int j = 0; j < m; j++) {
                PlanTask t = phase.tasks.get(j);
                t.dueDate = ps.plusDays(Math.min(span - 1, span * (j + 1) / m));
            }
        }
    }
    
    private String buildPhaseInfoJson(PlanContent content) {
        try {
            List<Map<String, Object>> list = content.phases.stream().map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("title", p.title);
                m.put("reason", p.reason == null ? "" : p.reason);
                m.put("startDate", p.startDate == null ? null : p.startDate.toString());
                m.put("endDate", p.endDate == null ? null : p.endDate.toString());
                return m;
            }).collect(Collectors.toList());
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }
    
    private String normalizeGoal(String goal) {
        if (goal == null) return GOAL_DEFAULT;
        return switch (goal.trim()) {
            case "冲奖" -> "冲奖";
            case "体验" -> "体验";
            default -> "稳完赛";
        };
    }
    
    // ==================== 详情/列表 ====================
    
    /** 我的计划列表 */
    public List<PreparationPlan> myPlans(Long userId) {
        return planRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    /** 计划详情(含按阶段分组的任务 + 阶段理由与日期) */
    public Map<String, Object> detail(Long planId) {
        PreparationPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("计划不存在"));
        List<PreparationTask> tasks = taskRepository.findByPlanIdOrderBySortOrderAsc(planId);
        
        Map<String, List<PreparationTask>> grouped = new LinkedHashMap<>();
        for (PreparationTask t : tasks) {
            grouped.computeIfAbsent(t.getPhaseTitle(), k -> new ArrayList<>()).add(t);
        }
        
        // 阶段元信息(title → {reason,startDate,endDate})
        Map<String, Map<String, Object>> meta = parsePhaseInfo(plan.getPhaseInfo());
        
        List<Map<String, Object>> phases = grouped.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("title", e.getKey());
                    m.put("tasks", e.getValue());
                    long doneInPhase = e.getValue().stream().filter(t -> Boolean.TRUE.equals(t.getDone())).count();
                    m.put("doneCount", doneInPhase);
                    m.put("totalCount", e.getValue().size());
                    Map<String, Object> pm = meta.getOrDefault(e.getKey(), Map.of());
                    m.put("reason", pm.getOrDefault("reason", ""));
                    m.put("startDate", pm.get("startDate"));
                    m.put("endDate", pm.get("endDate"));
                    return m;
                })
                .collect(Collectors.toList());
        
        Map<String, Object> result = new HashMap<>();
        result.put("plan", plan);
        result.put("phases", phases);
        result.put("progress", plan.getTaskCount() > 0
                ? Math.round(plan.getDoneCount() * 100.0 / plan.getTaskCount()) : 0);
        return result;
    }
    
    private Map<String, Map<String, Object>> parsePhaseInfo(String json) {
        Map<String, Map<String, Object>> map = new HashMap<>();
        if (json == null || json.isBlank()) return map;
        try {
            List<Map<String, Object>> list = objectMapper.readValue(json, new TypeReference<>() {});
            for (Map<String, Object> m : list) {
                Object t = m.get("title");
                if (t != null) map.put(String.valueOf(t), m);
            }
        } catch (Exception ignored) {
        }
        return map;
    }
    
    // ==================== 打卡/任务操作 ====================
    
    /** 打卡/取消打卡(保持简单) */
    @Transactional
    public PreparationTask toggleTask(Long planId, Long taskId, Long userId) {
        PreparationPlan plan = ownPlan(planId, userId);
        PreparationTask task = ownTask(planId, taskId);
        task.setDone(!Boolean.TRUE.equals(task.getDone()));
        task.setDoneAt(task.getDone() ? java.time.LocalDateTime.now() : null);
        PreparationTask saved = taskRepository.save(task);
        plan.setDoneCount((int) taskRepository.countByPlanIdAndDoneTrue(planId));
        planRepository.save(plan);
        return saved;
    }
    
    /** 换一个任务:AI 重新生成同类任务(保留打卡与截止日) */
    @Transactional
    public PreparationTask swapTask(Long planId, Long taskId, Long userId) {
        PreparationPlan plan = ownPlan(planId, userId);
        PreparationTask task = ownTask(planId, taskId);
        Competition c = competitionRepository.findById(plan.getCompetitionId()).orElse(null);
        
        String alternative = trySwapAlternative(plan, c, task);
        if (alternative != null) {
            try {
                Map<String, Object> parsed = objectMapper.readValue(alternative, new TypeReference<>() {});
                String title = String.valueOf(parsed.getOrDefault("title", task.getTitle()));
                if (!title.isBlank() && title.length() <= 200) task.setTitle(title);
                Object desc = parsed.get("description");
                if (desc != null) task.setDescription(String.valueOf(desc));
                Object hours = parsed.get("hours");
                if (hours != null) {
                    try {
                        int h = Integer.parseInt(String.valueOf(hours));
                        task.setEstimatedHours(Math.max(1, Math.min(12, h)));
                    } catch (NumberFormatException ignored) {
                    }
                }
            } catch (Exception e) {
                log.warn("换任务解析失败,保持原标题: {}", e.getMessage());
            }
        }
        return taskRepository.save(task);
    }
    
    private String trySwapAlternative(PreparationPlan plan, Competition c, PreparationTask task) {
        String system = """
                你是大学生竞赛备赛教练。用户想换掉计划里的一个任务,请给出一个同类但不同的替代任务。
                只输出 JSON:{"title":"任务标题(20字内)","description":"任务说明(60字内)","hours":2}
                要求:与用户换掉的任务目标一致但形式不同,不与用户已有任务重复,具体可执行。""";
        String user = String.format("""
                竞赛:%s(%s),目标:%s,每周%d小时
                当前阶段:%s
                要换掉的任务:%s(%s)
                该阶段其他任务:%s
                """,
                plan.getCompetitionName(),
                c == null ? "" : (c.getRules() == null || c.getRules().isBlank() ? "暂无规则" : c.getRules().substring(0, Math.min(150, c.getRules().length()))),
                plan.getGoal() == null ? GOAL_DEFAULT : plan.getGoal(),
                plan.getWeeklyHours() == null ? 8 : plan.getWeeklyHours(),
                task.getPhaseTitle(), task.getTitle(),
                task.getDescription() == null ? "" : task.getDescription(),
                taskRepository.findByPlanIdOrderBySortOrderAsc(plan.getId()).stream()
                        .filter(t -> t.getPhaseTitle().equals(task.getPhaseTitle()) && !t.getId().equals(task.getId()))
                        .map(PreparationTask::getTitle)
                        .collect(Collectors.joining("、")));
        String raw = deepSeekService.chat(system, user);
        if (raw == null || raw.isBlank()) return null;
        int s = raw.indexOf('{');
        int e = raw.lastIndexOf('}');
        if (s < 0 || e <= s) return null;
        return raw.substring(s, e + 1);
    }
    
    /** 编辑任务 */
    @Transactional
    public PreparationTask updateTask(Long planId, Long taskId, Long userId,
                                      String title, String description, Integer hours, LocalDate dueDate) {
        ownPlan(planId, userId);
        PreparationTask task = ownTask(planId, taskId);
        if (title != null && !title.isBlank() && title.length() <= 200) task.setTitle(title.trim());
        if (description != null) task.setDescription(description);
        if (hours != null) task.setEstimatedHours(Math.max(1, Math.min(12, hours)));
        if (dueDate != null) task.setDueDate(dueDate);
        return taskRepository.save(task);
    }
    
    /** 删除任务 */
    @Transactional
    public void deleteTask(Long planId, Long taskId, Long userId) {
        PreparationPlan plan = ownPlan(planId, userId);
        PreparationTask task = ownTask(planId, taskId);
        taskRepository.delete(task);
        plan.setTaskCount((int) taskRepository.countByPlanId(planId));
        plan.setDoneCount((int) taskRepository.countByPlanIdAndDoneTrue(planId));
        planRepository.save(plan);
    }
    
    // ==================== 一句话重排 ====================
    
    /**
     * AI 局部重排:仅重建未完成任务,已打卡保留
     */
    @Transactional
    public Map<String, Object> adjust(Long planId, Long userId, String instruction) {
        PreparationPlan plan = ownPlan(planId, userId);
        if (instruction == null || instruction.isBlank()) {
            throw new RuntimeException("请说说想怎么调整");
        }
        List<PreparationTask> tasks = taskRepository.findByPlanIdOrderBySortOrderAsc(planId);
        List<PreparationTask> undone = tasks.stream()
                .filter(t -> !Boolean.TRUE.equals(t.getDone()))
                .collect(Collectors.toList());
        List<PreparationTask> done = tasks.stream()
                .filter(t -> Boolean.TRUE.equals(t.getDone()))
                .collect(Collectors.toList());
        if (undone.isEmpty()) {
            throw new RuntimeException("所有任务已完成,无需调整");
        }
        
        PlanContent adjusted = tryAdjust(plan, undone, done, instruction);
        if (adjusted == null) {
            throw new RuntimeException("AI 调整失败,请稍后重试(原计划保持不变)");
        }
        
        // 重算未完成任务的日期:从今天到计划终点
        LocalDate start = LocalDate.now();
        LocalDate end = plan.getEndDate() != null && plan.getEndDate().isAfter(start)
                ? plan.getEndDate() : start.plusDays(30);
        assignDates(adjusted, start, end);
        
        // 删除未完成任务,插入新任务(保持已打卡任务原样)
        for (PreparationTask t : undone) taskRepository.delete(t);
        int order = 0;
        // 已打卡任务保留在前
        List<PreparationTask> keep = taskRepository.findByPlanIdOrderBySortOrderAsc(planId);
        for (PreparationTask t : keep) {
            t.setSortOrder(order++);
            taskRepository.save(t);
        }
        for (PlanPhase phase : adjusted.phases) {
            for (PlanTask t : phase.tasks) {
                PreparationTask task = new PreparationTask();
                task.setPlan(plan);
                task.setPhaseTitle(phase.title);
                task.setTitle(t.title);
                task.setDescription(t.description);
                task.setDueDate(t.dueDate);
                task.setEstimatedHours(t.hours == null ? 2 : t.hours);
                task.setSortOrder(order++);
                task.setDone(false);
                taskRepository.save(task);
            }
        }
        
        plan.setTitle(adjusted.title);
        plan.setOverview(adjusted.overview);
        plan.setPhaseInfo(buildPhaseInfoJson(adjusted));
        plan.setTaskCount((int) taskRepository.countByPlanId(planId));
        plan.setDoneCount((int) taskRepository.countByPlanIdAndDoneTrue(planId));
        plan.setStartDate(start);
        planRepository.save(plan);
        
        Map<String, Object> res = new HashMap<>();
        res.put("plan", plan);
        res.put("phases", adjusted.phases.stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("title", p.title);
            m.put("reason", p.reason);
            m.put("taskCount", p.tasks.size());
            return m;
        }).collect(Collectors.toList()));
        res.put("keptDoneCount", done.size());
        return res;
    }
    
    private PlanContent tryAdjust(PreparationPlan plan, List<PreparationTask> undone,
                                  List<PreparationTask> done, String instruction) {
        try {
            String system = """
                    你是大学生竞赛备赛教练。用户对备赛计划提出了调整意见,请重新规划【未完成】任务。
                    要求:
                    1. 2-4 个阶段,每阶段 2-3 个任务,总任务数与原来相当(不超过 12 个)
                    2. 严格遵循用户的调整意见
                    3. 不要安排已完成过的任务
                    4. 每个阶段给出 reason(一句话:为什么这么安排)
                    5. 只输出 JSON:
                    {"title":"计划标题","overview":"总览(60字内)",
                     "phases":[{"title":"阶段标题","reason":"为什么这么安排",
                                "tasks":[{"title":"任务标题","description":"说明(60字内)","hours":2}]}]}
                    """;
            String current = undone.stream()
                    .map(t -> String.format("「%s」%s · %s", t.getPhaseTitle(), t.getTitle(), t.getDescription()))
                    .collect(Collectors.joining("\n"));
            String doneText = done.isEmpty() ? "无"
                    : done.stream().map(PreparationTask::getTitle).collect(Collectors.joining("、"));
            String user = String.format("""
                    竞赛:%s | 目标:%s | 每周%d小时 | 计划终点:%s
                    
                    当前未完成任务:
                    %s
                    
                    已完成任务(不要重复安排):%s
                    
                    用户调整意见:%s
                    """,
                    plan.getCompetitionName(),
                    plan.getGoal() == null ? GOAL_DEFAULT : plan.getGoal(),
                    plan.getWeeklyHours() == null ? 8 : plan.getWeeklyHours(),
                    plan.getEndDate() == null ? "待定" : plan.getEndDate().toString(),
                    current, doneText, instruction);
            String raw = deepSeekService.chat(system, user);
            if (raw == null || raw.isBlank()) return null;
            int s = raw.indexOf('{');
            int e = raw.lastIndexOf('}');
            if (s < 0 || e <= s) return null;
            Map<String, Object> parsed = objectMapper.readValue(raw.substring(s, e + 1), new TypeReference<>() {});
            PlanContent content = parsePlanContent(parsed);
            return content.phases.isEmpty() ? null : content;
        } catch (Exception ex) {
            log.warn("AI 重排失败: {}", ex.getMessage());
            return null;
        }
    }
    
    // ==================== 删除 ====================
    
    @Transactional
    public boolean deletePlan(Long planId, Long userId) {
        PreparationPlan plan = planRepository.findById(planId).orElse(null);
        if (plan == null || !plan.getUserId().equals(userId)) return false;
        taskRepository.deleteByPlanId(planId);
        planRepository.delete(plan);
        return true;
    }
    
    // ==================== LLM 生成 ====================
    
    private PlanContent tryLlm(Competition c, UserProfile profile, String goal, int weeklyHours,
                               List<String> completed) {
        try {
            String systemPrompt = """
                    你是大学生竞赛备赛教练。根据比赛信息、赛制规则与学生情况，生成一份阶段化的备赛计划。
                    要求：
                    1. 3-4 个阶段，每个阶段 2-3 个任务，共 8-10 个任务
                    2. 任务要具体可执行（不是"多练习"，而是"完成近三年真题第1-3套并整理错题"）
                    3. 结合学生的目标、每周可投入时间与已完成盘点调整任务量与难度(目标"体验"任务要轻,"冲奖"要深)
                    4. 学生已完成的事项不要重复安排
                    5. 每个阶段给出 reason(一句话:为什么这个阶段这么安排、与评审标准的关系)
                    6. 每个任务给出 hours(预估小时数,1-6 整数)
                    7. 只输出 JSON，不要输出任何其他文字或代码块标记，格式：
                    {"title": "计划标题（15字内）", "overview": "计划总览（80字内）",
                     "phases": [{"title": "阶段标题", "reason": "为什么这么安排",
                                "tasks": [{"title": "任务标题", "description": "任务说明（60字内）", "hours": 2}]}]}
                    """;
            
            String profileText = profile == null ? "无画像信息" : String.format(
                    "学科:%s，专业:%s，年级:%s，兴趣:%s，技能:%s，每周可投入:%s小时，参赛经历:%s",
                    profile.getDiscipline(), profile.getMajor() == null ? "未知" : profile.getMajor(),
                    gradeLabel(profile.getGrade()),
                    profile.getInterests() == null || profile.getInterests().isEmpty() ? "无" : String.join("、", profile.getInterests()),
                    profile.getSkills() == null || profile.getSkills().isEmpty() ? "无" : String.join("、", profile.getSkills()),
                    profile.getWeeklyHours() == null ? "不限" : profile.getWeeklyHours(),
                    Boolean.TRUE.equals(profile.getHasExperience()) ? "有" : "无");
            
            String userMessage = String.format("""
                    比赛信息：
                    - 名称：%s
                    - 类别：%s，级别：%s，形式：%s
                    - 难度：%d/5，含金量：%d/5
                    - 比赛时间：%s，报名截止：%s
                    - 简介：%s
                    - 赛制规则与评审标准：%s
                    
                    学生情况：
                    %s
                    
                    本次生成条件：
                    - 参赛目标：%s
                    - 每周可投入：%d 小时
                    - 已完成盘点：%s
                    """,
                    c.getName(),
                    c.getCategory() == null ? "未知" : c.getCategory().getDescription(),
                    c.getLevel() == null ? "未知" : c.getLevel().getDescription(),
                    c.getFormat() == null ? "未知" : c.getFormat().getDescription(),
                    c.getDifficulty(), c.getPrestige(),
                    c.getCompetitionDate() == null ? "未定" : c.getCompetitionDate(),
                    c.getRegistrationEnd() == null ? "未定" : c.getRegistrationEnd().toString(),
                    c.getDescription() == null ? "" : c.getDescription(),
                    c.getRules() == null || c.getRules().isBlank() ? "暂无详细规则,以官网为准" : c.getRules(),
                    profileText, goal, weeklyHours,
                    completed == null || completed.isEmpty() ? "无(从零开始)" : String.join("、", completed));
            
            String content = deepSeekService.chat(systemPrompt, userMessage);
            if (content == null || content.isBlank()) return null;
            
            int start = content.indexOf('{');
            int end = content.lastIndexOf('}');
            if (start < 0 || end <= start) return null;
            
            Map<String, Object> parsed = objectMapper.readValue(
                    content.substring(start, end + 1), new TypeReference<>() {});
            PlanContent result = parsePlanContent(parsed);
            return result.phases.isEmpty() ? null : result;
        } catch (Exception e) {
            log.warn("LLM 备赛计划生成失败，使用模板兜底: {}", e.getMessage());
            return null;
        }
    }
    
    private PlanContent parsePlanContent(Map<String, Object> parsed) {
        PlanContent result = new PlanContent();
        result.title = String.valueOf(parsed.getOrDefault("title", "备赛计划"));
        result.overview = String.valueOf(parsed.getOrDefault("overview", ""));
        result.phases = new ArrayList<>();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> phases = (List<Map<String, Object>>) parsed.get("phases");
        if (phases == null) return result;
        for (Map<String, Object> p : phases) {
            PlanPhase phase = new PlanPhase();
            phase.title = String.valueOf(p.get("title"));
            phase.reason = p.get("reason") == null ? "" : String.valueOf(p.get("reason"));
            phase.tasks = new ArrayList<>();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tasks = (List<Map<String, Object>>) p.get("tasks");
            if (tasks == null) continue;
            for (Map<String, Object> t : tasks) {
                PlanTask task = new PlanTask();
                task.title = String.valueOf(t.get("title"));
                task.description = t.get("description") == null ? "" : String.valueOf(t.get("description"));
                if (t.get("hours") != null) {
                    try {
                        task.hours = Math.max(1, Math.min(6, Integer.parseInt(String.valueOf(t.get("hours")))));
                    } catch (NumberFormatException ignored) {
                    }
                }
                phase.tasks.add(task);
            }
            if (!phase.tasks.isEmpty()) result.phases.add(phase);
        }
        // 上限保护
        int total = result.phases.stream().mapToInt(p -> p.tasks.size()).sum();
        if (total > MAX_TASKS) {
            int keep = MAX_TASKS;
            outer:
            for (PlanPhase ph : result.phases) {
                while (ph.tasks.size() > 0 && total > keep) {
                    ph.tasks.remove(ph.tasks.size() - 1);
                    total--;
                }
                if (total <= keep) break outer;
            }
        }
        return result;
    }
    
    // ==================== 模板兜底 ====================
    
    private PlanContent templatePlan(Competition c, UserProfile profile, String goal, int weeklyHours,
                                     List<String> completed) {
        int difficulty = c.getDifficulty() == null ? 3 : c.getDifficulty();
        boolean light = "体验".equals(goal);
        
        PlanContent content = new PlanContent();
        content.title = "备赛计划 · " + c.getName();
        content.overview = String.format(
                "针对「%s」的%s计划(难度 %d/5,每周投入约 %d 小时)。倒排至%s,按阶段推进。",
                c.getName(), goal, difficulty, weeklyHours, targetDateText(c));
        content.phases = new ArrayList<>();
        
        Set<String> doneSet = completed == null ? Set.of() : new HashSet<>(completed);
        boolean needTeam = !doneSet.contains("组队完成") && c.getFormat() == Competition.CompetitionFormat.TEAM;
        boolean needTopic = !doneSet.contains("选题确定");
        boolean needBase = !doneSet.contains("基础复习完成");
        
        PlanPhase p1 = new PlanPhase();
        p1.title = "阶段一 · 了解与准备";
        p1.reason = "先对齐赛制与评分标准,避免方向性返工";
        p1.tasks = new ArrayList<>();
        p1.tasks.add(new PlanTask("研读官方赛制与评分规则", "完整阅读比赛章程、评分标准和往届公告,明确参赛要求。", 2));
        if (needTopic) p1.tasks.add(new PlanTask("确定选题方向", "参考往年获奖作品,结合自身优势圈定 2-3 个备选选题。", 3));
        if (needBase) p1.tasks.add(new PlanTask("梳理知识盲区", "对照考点清单自测,列出薄弱环节作为专项重点。", 2));
        
        PlanPhase p2 = new PlanPhase();
        p2.title = "阶段二 · 专项突破";
        p2.reason = "针对短板集中投入,这是拉开差距的阶段";
        p2.tasks = new ArrayList<>();
        p2.tasks.add(new PlanTask("每周完成一套真题并复盘", "限时模拟,逐题复盘并整理错题本。", 4));
        p2.tasks.add(new PlanTask("针对薄弱环节专项训练", "每天固定时间攻克盲区,直到正确率稳定。", 3));
        if (needTeam) p2.tasks.add(new PlanTask("确定团队分工", "按技能与时间商定分工,明确各自负责模块。", 2));
        
        PlanPhase p3 = new PlanPhase();
        p3.title = light ? "阶段三 · 实战体验" : "阶段三 · 实战演练";
        p3.reason = "用完整模拟暴露问题,赛前留出修正窗口";
        p3.tasks = new ArrayList<>();
        p3.tasks.add(new PlanTask("完成一次完整模拟", "按正式比赛时长与规则完整走一遍,检验整体水平。", light ? 3 : 5));
        p3.tasks.add(new PlanTask("查漏补缺,巩固易错点", "根据模拟结果回归错题,做最后一轮强化。", 2));
        
        PlanPhase p4 = new PlanPhase();
        p4.title = "阶段四 · 赛前冲刺";
        p4.reason = "轻量收尾,保证比赛日状态";
        p4.tasks = new ArrayList<>();
        p4.tasks.add(new PlanTask("确认报名与材料", "核对报名信息、提交材料与比赛时间地点。", 1));
        p4.tasks.add(new PlanTask("调整作息,保持状态", "赛前一周规律作息,适当减量训练。", 1));
        
        content.phases.addAll(List.of(p1, p2, p3, p4));
        return content;
    }
    
    // ==================== 工具 ====================
    
    private PreparationPlan ownPlan(Long planId, Long userId) {
        PreparationPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("计划不存在"));
        if (!plan.getUserId().equals(userId)) {
            throw new RuntimeException("无权操作此计划");
        }
        return plan;
    }
    
    private PreparationTask ownTask(Long planId, Long taskId) {
        PreparationTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在"));
        if (!task.getPlan().getId().equals(planId)) {
            throw new RuntimeException("任务与计划不匹配");
        }
        return task;
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
    
    /** 计划内容结构 */
    private static class PlanContent {
        String title;
        String overview;
        List<PlanPhase> phases;
    }
    
    private static class PlanPhase {
        String title;
        String reason;
        LocalDate startDate;
        LocalDate endDate;
        List<PlanTask> tasks;
    }
    
    private static class PlanTask {
        String title;
        String description;
        Integer hours;
        LocalDate dueDate;
        
        PlanTask() {}
        
        PlanTask(String title, String description, int hours) {
            this.title = title;
            this.description = description;
            this.hours = hours;
        }
    }
}
