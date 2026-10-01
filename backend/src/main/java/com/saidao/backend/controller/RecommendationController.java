package com.saidao.backend.controller;

import com.saidao.backend.billing.BillingContext;
import com.saidao.backend.billing.BillingContext.BillingSession;
import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.dto.FeedbackRequest;
import com.saidao.backend.dto.RecommendationItem;
import com.saidao.backend.dto.RecommendationResponse;
import com.saidao.backend.entity.TokenScene;
import com.saidao.backend.service.AiBillingService;
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
 *
 * <p>计费口径：<b>前置校验（画像是否完整、竞赛库是否为空）在扣费之前完成</b> ——
 * 校验不通过不产生任何扣费记录；上游降级走规则推荐时本次免扣。
 * v1 的写法是先扣 15 Token，再在 controller 里 catch 掉异常返回 HTTP 200，
 * 切面看不到失败 → 永不退款（审计报告 P0-1）。
 */
@Slf4j
@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final AiBillingService aiBillingService;

    /** 生成推荐（大模型精排，失败自动降级规则推荐且本次免扣） */
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<RecommendationResponse>> generate() {
        Long userId = currentUserId();
        // 1) 前置校验：不收费
        recommendationService.precheck(userId);
        // 2) 预留
        BillingSession session = aiBillingService.begin(userId, TokenScene.RECOMMEND);
        try {
            RecommendationResponse response = recommendationService.generate(userId);
            response.setDegraded(session.degraded());
            response.setChargedTokens(session.degraded() ? 0L : session.ticket().amount());
            response.setDegradedReason(session.degraded() ? session.degradedReason() : null);
            // 3) 结算（成功）或释放（降级免扣）
            aiBillingService.complete(session);
            return ResponseEntity.ok(ApiResponse.success(
                    session.degraded() ? "推荐完成（AI 暂不可用，已用规则推荐，本次未扣费）" : "推荐完成",
                    response));
        } catch (RuntimeException e) {
            aiBillingService.fail(session, e.getClass().getSimpleName());
            throw e;
        } finally {
            BillingContext.clear();
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
