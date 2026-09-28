package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.ForumPost;
import com.training.backend.entity.ForumReply;
import com.training.backend.entity.Notification;
import com.training.backend.service.ForumService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 论坛接口(含点赞/收藏/关注/精华/通知)
 */
@RestController
@RequestMapping("/forum")
@RequiredArgsConstructor
public class ForumController {
    
    private final ForumService forumService;
    
    /** 帖子列表(板块/排序/搜索/竞赛标签/只看精华/校区范围) */
    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<List<ForumPost>>> list(
            @RequestParam(required = false) ForumPost.ForumBoard board,
            @RequestParam(required = false, defaultValue = "latest") String sort,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long competitionId,
            @RequestParam(required = false) Boolean essence,
            @RequestParam(required = false, defaultValue = "all") String scope) {
        return ResponseEntity.ok(ApiResponse.success(
                forumService.listPosts(board, sort, keyword, competitionId, essence,
                        currentUserIdOrNull(), scope)));
    }
    
    /** 板块定义 */
    @GetMapping("/boards")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> boards() {
        List<Map<String, String>> boards = List.of(
                Map.of("code", "TEAM_FIND", "name", "找队友"),
                Map.of("code", "Q_AND_A", "name", "竞赛问答"),
                Map.of("code", "EXPERIENCE", "name", "经验分享"),
                Map.of("code", "GENERAL", "name", "综合交流")
        );
        return ResponseEntity.ok(ApiResponse.success(boards));
    }
    
    /** 发帖 */
    @PostMapping("/posts")
    public ResponseEntity<ApiResponse<ForumPost>> create(@RequestBody Map<String, Object> body) {
        ForumPost.ForumBoard board = ForumPost.ForumBoard.valueOf(body.get("board").toString());
        String title = body.get("title").toString();
        String content = body.get("content") != null ? body.get("content").toString() : "";
        Long teamId = toLong(body.get("teamId"));
        Long competitionId = toLong(body.get("competitionId"));
        return ResponseEntity.ok(ApiResponse.success("发布成功",
                forumService.createPost(currentUserId(), board, title, content, teamId, competitionId)));
    }
    
    /** 帖子详情(浏览数+1,带当前用户点赞/收藏标记) */
    @GetMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<ForumPost>> detail(@PathVariable Long postId) {
        return ResponseEntity.ok(ApiResponse.success(forumService.getPost(postId, currentUserIdOrNull())));
    }
    
    /** 删除帖子(作者或管理员) */
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(@PathVariable Long postId) {
        forumService.deletePost(postId, currentUserId(), isAdmin());
        return ResponseEntity.ok(ApiResponse.success("帖子已删除", null));
    }
    
    /** 帖子点赞/取消 */
    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<ApiResponse<Map<String, Object>>> likePost(@PathVariable Long postId) {
        return ResponseEntity.ok(ApiResponse.success(forumService.togglePostLike(postId, currentUserId())));
    }
    
    /** 帖子收藏/取消 */
    @PostMapping("/posts/{postId}/favorite")
    public ResponseEntity<ApiResponse<Map<String, Object>>> favoritePost(@PathVariable Long postId) {
        return ResponseEntity.ok(ApiResponse.success(forumService.togglePostFavorite(postId, currentUserId())));
    }
    
    /** 我的收藏帖子 */
    @GetMapping("/favorites")
    public ResponseEntity<ApiResponse<List<ForumPost>>> myFavorites() {
        return ResponseEntity.ok(ApiResponse.success(forumService.getMyFavorites(currentUserId())));
    }
    
    /** 精华设置/取消(管理员) */
    @PostMapping("/posts/{postId}/essence")
    public ResponseEntity<ApiResponse<ForumPost>> essence(@PathVariable Long postId) {
        if (!isAdmin()) throw new RuntimeException("仅管理员可操作");
        return ResponseEntity.ok(ApiResponse.success(forumService.toggleEssence(postId)));
    }
    
    /** 置顶设置/取消(管理员) */
    @PostMapping("/posts/{postId}/pin")
    public ResponseEntity<ApiResponse<ForumPost>> pin(@PathVariable Long postId) {
        if (!isAdmin()) throw new RuntimeException("仅管理员可操作");
        return ResponseEntity.ok(ApiResponse.success(forumService.togglePinned(postId)));
    }
    
    /** 采纳/取消采纳回复(楼主或管理员) */
    @PostMapping("/replies/{replyId}/accept")
    public ResponseEntity<ApiResponse<Map<String, Object>>> accept(@PathVariable Long replyId) {
        return ResponseEntity.ok(ApiResponse.success(
                forumService.toggleAccept(replyId, currentUserId(), isAdmin())));
    }
    
    // ==================== AI 内容助手 ====================
    
    /** AI 润色/扩写帖子内容 */
    @com.training.backend.annotation.CostTokens(com.training.backend.entity.TokenScene.FORUM_POLISH)
    @PostMapping("/ai/polish")
    public ResponseEntity<ApiResponse<Map<String, String>>> aiPolish(@RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            throw new RuntimeException("内容不能为空");
        }
        String mode = body.getOrDefault("mode", "polish");
        String text = forumService.aiPolish(content, mode);
        return ResponseEntity.ok(ApiResponse.success(Map.of("text", text)));
    }
    
    /** AI 智能建议板块与竞赛标签 */
    @com.training.backend.annotation.CostTokens(com.training.backend.entity.TokenScene.FORUM_SUGGEST)
    @PostMapping("/ai/suggest")
    public ResponseEntity<ApiResponse<Map<String, Object>>> aiSuggest(@RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "");
        String content = body.getOrDefault("content", "");
        if (title.isBlank() && content.isBlank()) {
            throw new RuntimeException("请先填写标题或内容");
        }
        return ResponseEntity.ok(ApiResponse.success(forumService.aiSuggest(title, content)));
    }
    
    /** 回帖列表(带点赞标记) */
    @GetMapping("/posts/{postId}/replies")
    public ResponseEntity<ApiResponse<List<ForumReply>>> replies(@PathVariable Long postId) {
        return ResponseEntity.ok(ApiResponse.success(forumService.getReplies(postId, currentUserIdOrNull())));
    }
    
    /** 回帖 */
    @PostMapping("/posts/{postId}/replies")
    public ResponseEntity<ApiResponse<ForumReply>> reply(
            @PathVariable Long postId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            throw new RuntimeException("回复内容不能为空");
        }
        return ResponseEntity.ok(ApiResponse.success("回复成功",
                forumService.createReply(postId, currentUserId(), content)));
    }
    
    /** 回复点赞/取消 */
    @PostMapping("/replies/{replyId}/like")
    public ResponseEntity<ApiResponse<Map<String, Object>>> likeReply(@PathVariable Long replyId) {
        return ResponseEntity.ok(ApiResponse.success(forumService.toggleReplyLike(replyId, currentUserId())));
    }
    
    /** 删除回帖(作者或管理员) */
    @DeleteMapping("/replies/{replyId}")
    public ResponseEntity<ApiResponse<Void>> deleteReply(@PathVariable Long replyId) {
        forumService.deleteReply(replyId, currentUserId(), isAdmin());
        return ResponseEntity.ok(ApiResponse.success("回复已删除", null));
    }
    
    /** 关注/取消关注用户 */
    @PostMapping("/users/{userId}/follow")
    public ResponseEntity<ApiResponse<Boolean>> follow(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(forumService.toggleFollow(currentUserId(), userId)));
    }
    
    // ==================== 通知 ====================
    
    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<List<Notification>>> notifications() {
        return ResponseEntity.ok(ApiResponse.success(forumService.listNotifications(currentUserId())));
    }
    
    @GetMapping("/notifications/unread-count")
    public ResponseEntity<ApiResponse<Long>> unreadCount() {
        return ResponseEntity.ok(ApiResponse.success(forumService.unreadCount(currentUserId())));
    }
    
    @PostMapping("/notifications/read-all")
    public ResponseEntity<ApiResponse<Void>> readAll() {
        forumService.markAllRead(currentUserId());
        return ResponseEntity.ok(ApiResponse.success("已全部标记为已读", null));
    }
    
    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<ApiResponse<Void>> readOne(@PathVariable Long id) {
        return ResponseEntity.ok(forumService.markRead(currentUserId(), id)
                ? ApiResponse.success("ok", null) : ApiResponse.error("通知不存在"));
    }
    
    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        return ResponseEntity.ok(forumService.deleteNotification(currentUserId(), id)
                ? ApiResponse.success("已删除", null) : ApiResponse.error("通知不存在"));
    }
    
    // ==================== 工具 ====================
    
    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
    
    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
    
    private Long currentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        return null;
    }
    
    private Long toLong(Object o) {
        if (o == null) return null;
        try {
            return Long.valueOf(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
