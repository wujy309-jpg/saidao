package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.CreateCriteriaRequest;
import com.training.backend.dto.ReviewCriteriaResponse;
import com.training.backend.dto.UpdateCriteriaRequest;
import com.training.backend.service.ReviewCriteriaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 评审标准控制器
 */
@Slf4j
@RestController
@RequestMapping("/review-criteria")
@RequiredArgsConstructor
public class ReviewCriteriaController {
    
    private final ReviewCriteriaService reviewCriteriaService;
    
    /**
     * 创建评审标准
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ReviewCriteriaResponse>> createCriteria(
            @RequestBody CreateCriteriaRequest request) {
        log.info("创建评审标准: {}", request.getName());
        ReviewCriteriaResponse response = reviewCriteriaService.createCriteria(request);
        return ResponseEntity.ok(ApiResponse.success("评审标准创建成功", response));
    }
    
    /**
     * 获取所有评审标准
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReviewCriteriaResponse>>> getAllCriteria() {
        List<ReviewCriteriaResponse> criteria = reviewCriteriaService.getAllCriteria();
        return ResponseEntity.ok(ApiResponse.success(criteria));
    }
    
    /**
     * 根据ID获取评审标准
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReviewCriteriaResponse>> getCriteriaById(@PathVariable Long id) {
        ReviewCriteriaResponse response = reviewCriteriaService.getCriteriaById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 更新评审标准
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReviewCriteriaResponse>> updateCriteria(
            @PathVariable Long id, @RequestBody UpdateCriteriaRequest request) {
        log.info("更新评审标准: {}", id);
        ReviewCriteriaResponse response = reviewCriteriaService.updateCriteria(id, request);
        return ResponseEntity.ok(ApiResponse.success("评审标准更新成功", response));
    }
    
    /**
     * 删除评审标准
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCriteria(@PathVariable Long id) {
        log.info("删除评审标准: {}", id);
        reviewCriteriaService.deleteCriteria(id);
        return ResponseEntity.ok(ApiResponse.success("评审标准删除成功", null));
    }
    
    /**
     * 根据项目ID获取评审标准
     */
    @GetMapping("/project/{projectId}")
    public ResponseEntity<ApiResponse<List<ReviewCriteriaResponse>>> getCriteriaByProject(
            @PathVariable Long projectId) {
        List<ReviewCriteriaResponse> criteria = reviewCriteriaService.getCriteriaByProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(criteria));
    }
    
    /**
     * 根据任务ID获取评审标准
     */
    @GetMapping("/task/{taskId}")
    public ResponseEntity<ApiResponse<List<ReviewCriteriaResponse>>> getCriteriaByTask(
            @PathVariable Long taskId) {
        List<ReviewCriteriaResponse> criteria = reviewCriteriaService.getCriteriaByTask(taskId);
        return ResponseEntity.ok(ApiResponse.success(criteria));
    }
    
    /**
     * 根据难度级别获取评审标准
     */
    @GetMapping("/difficulty/{difficultyLevel}")
    public ResponseEntity<ApiResponse<List<ReviewCriteriaResponse>>> getCriteriaByDifficultyLevel(
            @PathVariable String difficultyLevel) {
        List<ReviewCriteriaResponse> criteria = reviewCriteriaService.getCriteriaByDifficultyLevel(difficultyLevel);
        return ResponseEntity.ok(ApiResponse.success(criteria));
    }
    
    /**
     * 根据标准类型获取评审标准
     */
    @GetMapping("/type/{criteriaType}")
    public ResponseEntity<ApiResponse<List<ReviewCriteriaResponse>>> getCriteriaByType(
            @PathVariable String criteriaType) {
        List<ReviewCriteriaResponse> criteria = reviewCriteriaService.getCriteriaByType(criteriaType);
        return ResponseEntity.ok(ApiResponse.success(criteria));
    }
    
    /**
     * 搜索评审标准
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ReviewCriteriaResponse>>> searchCriteria(
            @RequestParam String keyword) {
        List<ReviewCriteriaResponse> criteria = reviewCriteriaService.searchCriteria(keyword);
        return ResponseEntity.ok(ApiResponse.success(criteria));
    }
    
    /**
     * 获取全局评审标准（未关联项目和任务）
     */
    @GetMapping("/global")
    public ResponseEntity<ApiResponse<List<ReviewCriteriaResponse>>> getGlobalCriteria() {
        List<ReviewCriteriaResponse> criteria = reviewCriteriaService.getGlobalCriteria();
        return ResponseEntity.ok(ApiResponse.success(criteria));
    }
    
    /**
     * 获取适合材料的评审标准
     */
    @GetMapping("/material/{materialId}")
    public ResponseEntity<ApiResponse<List<ReviewCriteriaResponse>>> getCriteriaForMaterial(
            @PathVariable Long materialId) {
        List<ReviewCriteriaResponse> criteria = reviewCriteriaService.getCriteriaForMaterial(materialId);
        return ResponseEntity.ok(ApiResponse.success(criteria));
    }
}