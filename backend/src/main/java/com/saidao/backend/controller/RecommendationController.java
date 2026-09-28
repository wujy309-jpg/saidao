package com.saidao.backend.controller;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.dto.FeedbackRequest;
import com.saidao.backend.dto.RecommendationItem;
import com.saidao.backend.dto.RecommendationResponse;
import com.saidao.backend.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 竞赛推荐接口
 */
@Slf4j
@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {
    
    private final RecommendationService recommendationService;
    
    /** 生成推荐（大模型精排，失败自动降级规则推荐） */
    @com.saidao.backend.annotation.CostTokens(com.saidao.backend.entity.TokenScene.RECOMMEND)
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<RecommendationResponse>> generate() {
        try {
            Long userId = currentUserId();
            return ResponseEntity.ok(ApiResponse.success("推荐完成", recommendationService.generate(userId)));
        } catch (IllegalStateException e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }
    
    /** 推荐历史 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RecommendationItem>>> history() {
        return ResponseEntity.ok(ApiResponse.success(recommendationService.history(currentUserId())));
    }
    
    /** 反馈 */
    @PostMapping("/{recordId}/feedback")
    public ResponseEntity<ApiResponse<Void>> feedback(@PathVariable Long recordId, @RequestBody FeedbackRequest request) {
        boolean ok = recommendationService.feedback(currentUserId(), recordId, request.getFeedback());
        return ok ? ResponseEntity.ok(ApiResponse.success("感谢反馈", null))
                : ResponseEntity.ok(ApiResponse.error("记录不存在"));
    }
    
    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
}
