package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.CreateLearningPathRequest;
import com.training.backend.dto.GenerateLearningPathRequest;
import com.training.backend.dto.LearningPathResponse;
import com.training.backend.dto.LearningStepResponse;
import com.training.backend.service.LearningPathService;
import com.training.backend.service.LearningPathService.LearningPathStatistics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 学习路径控制器
 */
@Slf4j
@RestController
@RequestMapping("/learning-paths")
@RequiredArgsConstructor
public class LearningPathController {
    
    private final LearningPathService learningPathService;
    
    /**
     * 创建学习路径
     */
    @PostMapping
    public ResponseEntity<ApiResponse<LearningPathResponse>> createLearningPath(
            @RequestBody CreateLearningPathRequest request) {
        log.info("创建学习路径: {}", request.getPathName());
        LearningPathResponse response = learningPathService.createLearningPath(request);
        return ResponseEntity.ok(ApiResponse.success("学习路径创建成功", response));
    }
    
    /**
     * 获取学生的所有学习路径
     */
    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<LearningPathResponse>>> getLearningPathsByStudent(
            @PathVariable Long studentId) {
        List<LearningPathResponse> paths = learningPathService.getLearningPathsByStudent(studentId);
        return ResponseEntity.ok(ApiResponse.success(paths));
    }
    
    /**
     * 获取学生指定状态的学习路径
     */
    @GetMapping("/student/{studentId}/status/{status}")
    public ResponseEntity<ApiResponse<List<LearningPathResponse>>> getLearningPathsByStudentAndStatus(
            @PathVariable Long studentId, @PathVariable String status) {
        List<LearningPathResponse> paths = learningPathService.getLearningPathsByStudentAndStatus(studentId, status);
        return ResponseEntity.ok(ApiResponse.success(paths));
    }
    
    /**
     * 根据ID获取学习路径
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LearningPathResponse>> getLearningPathById(@PathVariable Long id) {
        LearningPathResponse response = learningPathService.getLearningPathById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 更新学习路径状态
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<LearningPathResponse>> updateLearningPathStatus(
            @PathVariable Long id, @RequestParam String status) {
        log.info("更新学习路径状态: {} -> {}", id, status);
        LearningPathResponse response = learningPathService.updateLearningPathStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("学习路径状态更新成功", response));
    }
    
    /**
     * 更新学习步骤状态
     */
    @PutMapping("/steps/{stepId}/status")
    public ResponseEntity<ApiResponse<LearningStepResponse>> updateLearningStepStatus(
            @PathVariable Long stepId, @RequestParam String status) {
        log.info("更新学习步骤状态: {} -> {}", stepId, status);
        LearningStepResponse response = learningPathService.updateLearningStepStatus(stepId, status);
        return ResponseEntity.ok(ApiResponse.success("学习步骤状态更新成功", response));
    }
    
    /**
     * 删除学习路径
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteLearningPath(@PathVariable Long id) {
        log.info("删除学习路径: {}", id);
        learningPathService.deleteLearningPath(id);
        return ResponseEntity.ok(ApiResponse.success("学习路径删除成功", null));
    }
    
    /**
     * 使用AI生成学习路径
     */
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<LearningPathResponse>> generateLearningPathWithAI(
            @RequestBody GenerateLearningPathRequest request) {
        log.info("使用AI生成学习路径");
        LearningPathResponse response = learningPathService.generateLearningPathWithAI(request);
        return ResponseEntity.ok(ApiResponse.success("学习路径生成成功", response));
    }
    
    /**
     * 获取学生的学习路径统计
     */
    @GetMapping("/student/{studentId}/statistics")
    public ResponseEntity<ApiResponse<LearningPathStatistics>> getStudentStatistics(
            @PathVariable Long studentId) {
        LearningPathStatistics statistics = learningPathService.getStudentStatistics(studentId);
        return ResponseEntity.ok(ApiResponse.success(statistics));
    }
}