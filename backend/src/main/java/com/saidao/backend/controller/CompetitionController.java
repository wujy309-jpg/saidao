package com.saidao.backend.controller;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.dto.CompetitionRequest;
import com.saidao.backend.entity.Competition;
import com.saidao.backend.entity.CompetitionFeedback;
import com.saidao.backend.entity.ExcellentWork;
import com.saidao.backend.entity.Favorite;
import com.saidao.backend.service.CompetitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 竞赛库接口
 */
@RestController
@RequestMapping("/competitions")
@RequiredArgsConstructor
public class CompetitionController {
    
    private final CompetitionService competitionService;
    
    /** 竞赛库列表（筛选+搜索，游客可浏览） */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Competition>>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String catalogList,
            @RequestParam(required = false) Boolean baoyanBonus) {
        return ResponseEntity.ok(ApiResponse.success(
                competitionService.list(category, level, format, keyword, catalogList, baoyanBonus)));
    }
    
    /** 竞赛详情（游客可浏览，收藏/状态仅登录后返回） */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> detail(@PathVariable Long id) {
        Competition c = competitionService.get(id);
        if (c == null) {
            return ResponseEntity.ok(ApiResponse.error("竞赛不存在"));
        }
        Long userId = currentUserIdOrNull();
        boolean favorited = userId != null && competitionService.isFavorited(userId, id);
        Favorite fav = userId != null ? competitionService.getFavorite(userId, id) : null;
        CompetitionFeedback feedback = userId != null ? competitionService.getFeedback(userId, id) : null;
        Map<String, Object> data = new HashMap<>();
        data.put("competition", c);
        data.put("favorited", favorited);
        data.put("status", fav != null ? fav.getStatus().name() : null);
        data.put("feedback", feedback != null ? feedback.getAction().name() : null);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
    
    /** 收藏/取消收藏（关注） */
    @PostMapping("/{id}/favorite")
    public ResponseEntity<ApiResponse<Boolean>> toggleFavorite(@PathVariable Long id) {
        boolean nowFavorited = competitionService.toggleFavorite(currentUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(
                nowFavorited ? "已收藏" : "已取消收藏", nowFavorited));
    }
    
    /** 更新参赛状态：WATCHING/REGISTERED/PREPARING/COMPLETED/AWARDED */
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Favorite>> updateStatus(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Favorite.JourneyStatus status = Favorite.JourneyStatus.valueOf(body.get("status"));
        Favorite fav = competitionService.updateStatus(currentUserId(), id, status);
        return ResponseEntity.ok(ApiResponse.success("状态已更新为「" + status.getDescription() + "」", fav));
    }
    
    /** 我的竞赛（含参赛状态） */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> myCompetitions() {
        return ResponseEntity.ok(ApiResponse.success(competitionService.getMyCompetitions(currentUserId())));
    }
    
    /** 行为反馈：LIKE/DISLIKE */
    @PostMapping("/{id}/feedback")
    public ResponseEntity<ApiResponse<CompetitionFeedback>> feedback(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        CompetitionFeedback.FeedbackAction action =
                CompetitionFeedback.FeedbackAction.valueOf(body.get("action"));
        CompetitionFeedback saved = competitionService.setFeedback(currentUserId(), id, action);
        String msg = action == CompetitionFeedback.FeedbackAction.DISLIKE
                ? "已记录，后续推荐将减少此类比赛" : "已记录，后续推荐将增加此类比赛";
        return ResponseEntity.ok(ApiResponse.success(msg, saved));
    }
    
    /** 撤销反馈 */
    @DeleteMapping("/{id}/feedback")
    public ResponseEntity<ApiResponse<Void>> removeFeedback(@PathVariable Long id) {
        competitionService.removeFeedback(currentUserId(), id);
        return ResponseEntity.ok(ApiResponse.success("反馈已撤销", null));
    }
    
    /** 相似竞赛推荐 */
    @GetMapping("/{id}/similar")
    public ResponseEntity<ApiResponse<List<Competition>>> similar(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(competitionService.similar(id, 6)));
    }
    
    /** 历年优秀作品 */
    @GetMapping("/{id}/works")
    public ResponseEntity<ApiResponse<List<ExcellentWork>>> works(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(competitionService.getExcellentWorks(id)));
    }
    
    // ============ 管理端（SecurityConfig 中 /admin 前缀校验 ADMIN 角色） ============
    
    @PostMapping
    public ResponseEntity<ApiResponse<Competition>> create(@RequestBody CompetitionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("创建成功", competitionService.create(request)));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Competition>> update(@PathVariable Long id, @RequestBody CompetitionRequest request) {
        Competition c = competitionService.update(id, request);
        if (c == null) return ResponseEntity.ok(ApiResponse.error("竞赛不存在"));
        return ResponseEntity.ok(ApiResponse.success("更新成功", c));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        return competitionService.delete(id)
                ? ResponseEntity.ok(ApiResponse.success("删除成功", null))
                : ResponseEntity.ok(ApiResponse.error("竞赛不存在"));
    }
    
    /** 管理端列表（含已结束） */
    @GetMapping("/admin/all")
    public ResponseEntity<ApiResponse<List<Competition>>> adminAll() {
        return ResponseEntity.ok(ApiResponse.success(competitionService.listAllForAdmin()));
    }
    
    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
    
    /** 游客访问时返回 null */
    private Long currentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        return null;
    }
}
