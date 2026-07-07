package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.AiReviewResponse;
import com.training.backend.dto.ReviewCriteriaResponse;
import com.training.backend.service.AiReviewService;
import com.training.backend.service.DeepSeekService;
import com.training.backend.service.ReviewCriteriaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI评审控制器
 */
@Slf4j
@RestController
@RequestMapping("/ai-reviews")
@RequiredArgsConstructor
public class AiReviewController {
    
    private final AiReviewService aiReviewService;
    private final DeepSeekService deepSeekService;
    private final ReviewCriteriaService reviewCriteriaService;
    
    /**
     * 获取材料的AI评审记录
     */
    @GetMapping("/material/{materialId}")
    public ResponseEntity<ApiResponse<List<AiReviewResponse>>> getMaterialReviews(@PathVariable Long materialId) {
        List<AiReviewResponse> reviews = aiReviewService.getMaterialReviews(materialId);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }
    
    /**
     * 获取用户的平均AI评分
     */
    @GetMapping("/user/{userId}/average-score")
    public ResponseEntity<ApiResponse<Double>> getUserAverageScore(@PathVariable Long userId) {
        Double averageScore = aiReviewService.getUserAverageScore(userId);
        return ResponseEntity.ok(ApiResponse.success(averageScore));
    }
    
    /**
     * 生成学习建议
     */
    @PostMapping("/learning-advice")
    public ResponseEntity<ApiResponse<String>> generateLearningAdvice(@RequestBody Map<String, String> request) {
        String studentName = request.getOrDefault("studentName", "同学");
        String taskTitle = request.getOrDefault("taskTitle", "实训任务");
        String currentProgress = request.getOrDefault("currentProgress", "进行中");
        
        String advice = deepSeekService.generateLearningAdvice(studentName, taskTitle, currentProgress);
        
        if (advice != null) {
            return ResponseEntity.ok(ApiResponse.success(advice));
        } else {
            return ResponseEntity.ok(ApiResponse.success("暂无AI建议，请继续努力！"));
        }
    }
    
    /**
     * AI代码评审（直接调用）
     */
    @PostMapping("/review-code")
    public ResponseEntity<ApiResponse<String>> reviewCode(@RequestBody Map<String, String> request) {
        String code = request.getOrDefault("code", "");
        String language = request.getOrDefault("language", "Java");
        
        String result = deepSeekService.reviewCode(code, language);
        
        if (result != null) {
            return ResponseEntity.ok(ApiResponse.success(result));
        } else {
            return ResponseEntity.ok(ApiResponse.error("AI评审服务暂时不可用"));
        }
    }
    
    /**
     * 使用自定义评审标准进行代码评审
     */
    @PostMapping("/review-code-with-criteria")
    public ResponseEntity<ApiResponse<String>> reviewCodeWithCriteria(@RequestBody Map<String, Object> request) {
        String code = (String) request.getOrDefault("code", "");
        String language = (String) request.getOrDefault("language", "Java");
        Long criteriaId = Long.valueOf(request.get("criteriaId").toString());
        
        // 获取评审标准
        ReviewCriteriaResponse criteria = reviewCriteriaService.getCriteriaById(criteriaId);
        
        // 构建评审标准描述
        String criteriaDescription = buildCriteriaDescription(criteria);
        
        String result = deepSeekService.reviewCodeWithCriteria(code, language, criteriaDescription);
        
        if (result != null) {
            return ResponseEntity.ok(ApiResponse.success(result));
        } else {
            return ResponseEntity.ok(ApiResponse.error("AI评审服务暂时不可用"));
        }
    }
    
    /**
     * 构建评审标准描述
     */
    private String buildCriteriaDescription(ReviewCriteriaResponse criteria) {
        StringBuilder description = new StringBuilder();
        description.append("评审标准: ").append(criteria.getName()).append("\n");
        description.append("标准描述: ").append(criteria.getDescription()).append("\n");
        description.append("难度级别: ").append(criteria.getDifficultyLevelDescription()).append("\n");
        description.append("标准类型: ").append(criteria.getCriteriaTypeDescription()).append("\n\n");
        
        description.append("评审维度:\n");
        if (criteria.getDimensions() != null) {
            criteria.getDimensions().forEach(dimension -> {
                description.append("- ").append(dimension.getName())
                        .append(" (权重: ").append(dimension.getWeight()).append("%")
                        .append(", 最高分: ").append(dimension.getMaxScore()).append(")\n");
                description.append("  评分标准: ").append(dimension.getScoringCriteria()).append("\n");
            });
        }
        
        return description.toString();
    }
}
