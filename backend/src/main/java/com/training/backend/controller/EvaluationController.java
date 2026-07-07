package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.Evaluation;
import com.training.backend.service.EvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 评价控制器
 */
@Slf4j
@RestController
@RequestMapping("/evaluations")
@RequiredArgsConstructor
public class EvaluationController {
    
    private final EvaluationService evaluationService;
    
    /**
     * 创建评价
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Evaluation>> createEvaluation(
            @Valid @RequestBody Evaluation evaluation,
            @RequestParam Long evaluatorId,
            @RequestParam Long evaluateeId,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long taskId) {
        Evaluation createdEvaluation = evaluationService.createEvaluation(
                evaluation, evaluatorId, evaluateeId, projectId, taskId);
        return ResponseEntity.ok(ApiResponse.success("评价创建成功", createdEvaluation));
    }
    
    /**
     * 获取被评价人的所有评价
     */
    @GetMapping("/evaluatee/{evaluateeId}")
    public ResponseEntity<ApiResponse<List<Evaluation>>> getEvaluationsByEvaluatee(
            @PathVariable Long evaluateeId) {
        List<Evaluation> evaluations = evaluationService.getEvaluationsByEvaluatee(evaluateeId);
        return ResponseEntity.ok(ApiResponse.success(evaluations));
    }
    
    /**
     * 获取被评价人在某项目的评价
     */
    @GetMapping("/evaluatee/{evaluateeId}/project/{projectId}")
    public ResponseEntity<ApiResponse<List<Evaluation>>> getEvaluationsByEvaluateeAndProject(
            @PathVariable Long evaluateeId,
            @PathVariable Long projectId) {
        List<Evaluation> evaluations = evaluationService.getEvaluationsByEvaluateeAndProject(
                evaluateeId, projectId);
        return ResponseEntity.ok(ApiResponse.success(evaluations));
    }
    
    /**
     * 获取项目的评价
     */
    @GetMapping("/project/{projectId}")
    public ResponseEntity<ApiResponse<List<Evaluation>>> getEvaluationsByProject(
            @PathVariable Long projectId) {
        List<Evaluation> evaluations = evaluationService.getEvaluationsByProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(evaluations));
    }
    
    /**
     * 获取用户的平均得分
     */
    @GetMapping("/average/{evaluateeId}")
    public ResponseEntity<ApiResponse<Double>> getAverageScore(@PathVariable Long evaluateeId) {
        Double averageScore = evaluationService.getAverageScore(evaluateeId);
        return ResponseEntity.ok(ApiResponse.success(averageScore));
    }
    
    /**
     * 获取用户的维度平均分
     */
    @GetMapping("/dimensions/{evaluateeId}")
    public ResponseEntity<ApiResponse<Map<String, Double>>> getDimensionAverages(
            @PathVariable Long evaluateeId) {
        Map<String, Double> averages = evaluationService.getDimensionAverages(evaluateeId);
        return ResponseEntity.ok(ApiResponse.success(averages));
    }
    
    /**
     * 删除评价
     */
    @DeleteMapping("/{evaluationId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvaluation(@PathVariable Long evaluationId) {
        evaluationService.deleteEvaluation(evaluationId);
        return ResponseEntity.ok(ApiResponse.success("评价已删除", null));
    }
}
