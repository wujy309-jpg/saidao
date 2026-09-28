package com.training.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.Competition;
import com.training.backend.entity.PreparationPlan;
import com.training.backend.entity.PreparationTask;
import com.training.backend.repository.CompetitionRepository;
import com.training.backend.service.PreparationPlanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * 备赛计划接口(条件化生成 + 流式叙事 + 任务编辑/换一个 + 一句话重排)
 */
@Slf4j
@RestController
@RequestMapping("/preparation-plans")
@RequiredArgsConstructor
public class PreparationPlanController {
    
    private final PreparationPlanService planService;
    private final CompetitionRepository competitionRepository;
    private final com.training.backend.service.TokenService tokenService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /** 生成备赛计划(非流式,兼容旧调用) */
    @com.training.backend.annotation.CostTokens(com.training.backend.entity.TokenScene.PLAN_GENERATE)
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<PreparationPlan>> generate(@RequestBody Map<String, Object> body) {
        Long competitionId = Long.valueOf(body.get("competitionId").toString());
        return ResponseEntity.ok(ApiResponse.success("计划已生成",
                planService.generate(currentUserId(), competitionId,
                        str(body.get("goal")), intOf(body.get("weeklyHours")),
                        strList(body.get("completed")))));
    }
    
    /**
     * 流式生成:先叙事(读取时间线/倒排/分配/优化),完成事件携带 planId
     * 事件: step {text} / done {planId}
     * 扣费:SSE 异步执行,在控制器内显式扣费,失败自动退款
     */
    @PostMapping(value = "/generate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generateStream(@RequestBody Map<String, Object> body) {
        Long userId = currentUserId();
        Long competitionId = Long.valueOf(body.get("competitionId").toString());
        String goal = str(body.get("goal"));
        Integer weeklyHours = intOf(body.get("weeklyHours"));
        List<String> completed = strList(body.get("completed"));
        
        SseEmitter emitter = new SseEmitter(3 * 60 * 1000L);
        long cost = tokenService.consume(userId, com.training.backend.entity.TokenScene.PLAN_STREAM, null);
        CompletableFuture.runAsync(() -> {
            try {
                Competition c = competitionRepository.findById(competitionId).orElse(null);
                long days = daysUntilTarget(c);
                String goalText = goal == null || goal.isBlank() ? "稳完赛" : goal;
                
                send(emitter, "step", Map.of("text",
                        "读取「" + (c == null ? "比赛" : c.getName()) + "」的时间线与赛制规则…"));
                send(emitter, "step", Map.of("text",
                        days > 0 ? "距比赛还有 " + days + " 天,按阶段倒排…" : "按比赛时间倒排阶段…"));
                send(emitter, "step", Map.of("text",
                        "结合目标「" + goalText + "」与每周 " + (weeklyHours == null ? "常规" : weeklyHours + " 小时") + ",分配任务强度…"));
                send(emitter, "step", Map.of("text", "对照评审标准与历年优秀作品,优化任务细节…"));
                
                PreparationPlan plan = planService.generate(userId, competitionId, goal, weeklyHours, completed);
                
                send(emitter, "step", Map.of("text",
                        "计划就绪:共 " + plan.getTaskCount() + " 个任务,已为你倒排好日期"));
                Map<String, Object> done = new java.util.HashMap<>();
                done.put("planId", plan.getId());
                done.put("title", plan.getTitle());
                done.put("goal", plan.getGoal());
                done.put("weeklyHours", plan.getWeeklyHours());
                done.put("taskCount", plan.getTaskCount());
                done.put("startDate", plan.getStartDate() == null ? null : plan.getStartDate().toString());
                done.put("endDate", plan.getEndDate() == null ? null : plan.getEndDate().toString());
                done.put("baseline", plan.getBaseline());
                int phaseCount = 0;
                try {
                    phaseCount = objectMapper.readTree(plan.getPhaseInfo() == null ? "[]" : plan.getPhaseInfo()).size();
                } catch (Exception ignored) {
                }
                done.put("phaseCount", phaseCount);
                send(emitter, "done", done);
                emitter.complete();
            } catch (Exception e) {
                log.error("流式生成备赛计划失败", e);
                if (cost > 0) {
                    try {
                        tokenService.refund(userId, com.training.backend.entity.TokenScene.PLAN_STREAM, null, cost);
                    } catch (Exception refundError) {
                        log.error("备赛计划退款失败 userId={}", userId, refundError);
                    }
                }
                send(emitter, "error", Map.of("message", e.getMessage()));
                emitter.complete();
            }
        });
        return emitter;
    }
    
    /** 我的计划列表 */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<PreparationPlan>>> mine() {
        return ResponseEntity.ok(ApiResponse.success(planService.myPlans(currentUserId())));
    }
    
    /** 计划详情(含按阶段分组的任务与进度) */
    @GetMapping("/{planId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> detail(@PathVariable Long planId) {
        return ResponseEntity.ok(ApiResponse.success(planService.detail(planId)));
    }
    
    /** 打卡/取消打卡(保持简单) */
    @PutMapping("/{planId}/tasks/{taskId}/toggle")
    public ResponseEntity<ApiResponse<PreparationTask>> toggle(
            @PathVariable Long planId, @PathVariable Long taskId) {
        return ResponseEntity.ok(ApiResponse.success("已更新",
                planService.toggleTask(planId, taskId, currentUserId())));
    }
    
    /** 换一个任务(AI 重新生成同类任务,打卡与截止日保留) */
    @com.training.backend.annotation.CostTokens(com.training.backend.entity.TokenScene.TASK_SWAP)
    @PostMapping("/{planId}/tasks/{taskId}/swap")
    public ResponseEntity<ApiResponse<PreparationTask>> swap(
            @PathVariable Long planId, @PathVariable Long taskId) {
        return ResponseEntity.ok(ApiResponse.success("已换一个新任务",
                planService.swapTask(planId, taskId, currentUserId())));
    }
    
    /** 编辑任务 */
    @PutMapping("/{planId}/tasks/{taskId}")
    public ResponseEntity<ApiResponse<PreparationTask>> updateTask(
            @PathVariable Long planId, @PathVariable Long taskId,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success("任务已更新",
                planService.updateTask(planId, taskId, currentUserId(),
                        str(body.get("title")), str(body.get("description")),
                        intOf(body.get("estimatedHours")), dateOf(body.get("dueDate")))));
    }
    
    /** 删除任务 */
    @DeleteMapping("/{planId}/tasks/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @PathVariable Long planId, @PathVariable Long taskId) {
        planService.deleteTask(planId, taskId, currentUserId());
        return ResponseEntity.ok(ApiResponse.success("任务已删除", null));
    }
    
    /** 一句话重排(AI 局部调整,已打卡保留) */
    @com.training.backend.annotation.CostTokens(com.training.backend.entity.TokenScene.PLAN_ADJUST)
    @PostMapping("/{planId}/adjust")
    public ResponseEntity<ApiResponse<Map<String, Object>>> adjust(
            @PathVariable Long planId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success("计划已按你的意见重排",
                planService.adjust(planId, currentUserId(), body.get("instruction"))));
    }
    
    /** 删除计划 */
    @DeleteMapping("/{planId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long planId) {
        return planService.deletePlan(planId, currentUserId())
                ? ResponseEntity.ok(ApiResponse.success("计划已删除", null))
                : ResponseEntity.ok(ApiResponse.error("计划不存在"));
    }
    
    // ==================== 工具 ====================
    
    private long daysUntilTarget(Competition c) {
        if (c == null) return 0;
        LocalDate target = null;
        try {
            if (c.getCompetitionDate() != null && c.getCompetitionDate().matches("\\d{4}-\\d{1,2}")) {
                String[] p = c.getCompetitionDate().split("-");
                target = LocalDate.of(Integer.parseInt(p[0]), Integer.parseInt(p[1]), 1);
            } else if (c.getCompetitionDate() != null && c.getCompetitionDate().contains("-")) {
                target = LocalDate.parse(c.getCompetitionDate().trim());
            }
        } catch (Exception ignored) {
        }
        if (target == null) target = c.getRegistrationEnd();
        if (target == null) return 0;
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), target);
    }
    
    private void send(SseEmitter emitter, String event, Map<String, Object> data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data));
        } catch (Exception e) {
            log.debug("SSE 发送失败: {}", e.getMessage());
        }
    }
    
    private String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }
    
    private Integer intOf(Object o) {
        if (o == null) return null;
        try {
            return Integer.valueOf(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
    @SuppressWarnings("unchecked")
    private List<String> strList(Object o) {
        if (o instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return null;
    }
    
    private LocalDate dateOf(Object o) {
        if (o == null) return null;
        try {
            return LocalDate.parse(String.valueOf(o));
        } catch (DateTimeParseException e) {
            return null;
        }
    }
    
    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
}
