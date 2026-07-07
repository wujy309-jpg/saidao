package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.TaskActivity;
import com.training.backend.entity.TaskComment;
import com.training.backend.service.CollaborationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/collaboration")
@RequiredArgsConstructor
public class CollaborationController {
    
    private final CollaborationService collaborationService;
    
    @PostMapping("/comments")
    public ResponseEntity<ApiResponse<TaskComment>> addComment(@RequestBody Map<String, Object> request) {
        Long taskId = Long.valueOf(request.get("taskId").toString());
        Long userId = Long.valueOf(request.get("userId").toString());
        String content = request.get("content").toString();
        Long parentId = request.get("parentId") != null ? Long.valueOf(request.get("parentId").toString()) : null;
        
        TaskComment comment = collaborationService.addComment(taskId, userId, content, parentId);
        return ResponseEntity.ok(ApiResponse.success("评论添加成功", comment));
    }
    
    @GetMapping("/comments/task/{taskId}")
    public ResponseEntity<ApiResponse<List<TaskComment>>> getTaskComments(@PathVariable Long taskId) {
        List<TaskComment> comments = collaborationService.getTaskComments(taskId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }
    
    @GetMapping("/comments/{commentId}/replies")
    public ResponseEntity<ApiResponse<List<TaskComment>>> getCommentReplies(@PathVariable Long commentId) {
        List<TaskComment> replies = collaborationService.getCommentReplies(commentId);
        return ResponseEntity.ok(ApiResponse.success(replies));
    }
    
    @GetMapping("/mentions/user/{userId}")
    public ResponseEntity<ApiResponse<List<TaskComment>>> getUserMentions(@PathVariable Long userId) {
        List<TaskComment> mentions = collaborationService.getUserMentions(userId);
        return ResponseEntity.ok(ApiResponse.success(mentions));
    }
    
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<TaskComment>> updateComment(
            @PathVariable Long commentId,
            @RequestBody Map<String, Object> request) {
        Long userId = Long.valueOf(request.get("userId").toString());
        String content = request.get("content").toString();
        
        TaskComment comment = collaborationService.updateComment(commentId, userId, content);
        return ResponseEntity.ok(ApiResponse.success("评论更新成功", comment));
    }
    
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @RequestParam Long userId) {
        collaborationService.deleteComment(commentId, userId);
        return ResponseEntity.ok(ApiResponse.success("评论删除成功", null));
    }
    
    @GetMapping("/activities/task/{taskId}")
    public ResponseEntity<ApiResponse<List<TaskActivity>>> getTaskActivities(@PathVariable Long taskId) {
        List<TaskActivity> activities = collaborationService.getTaskActivities(taskId);
        return ResponseEntity.ok(ApiResponse.success(activities));
    }
    
    @GetMapping("/activities/task/{taskId}/page")
    public ResponseEntity<ApiResponse<Page<TaskActivity>>> getTaskActivitiesPage(
            @PathVariable Long taskId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<TaskActivity> activities = collaborationService.getTaskActivities(taskId, pageable);
        return ResponseEntity.ok(ApiResponse.success(activities));
    }
    
    @GetMapping("/activities/user/{userId}")
    public ResponseEntity<ApiResponse<List<TaskActivity>>> getUserActivities(@PathVariable Long userId) {
        List<TaskActivity> activities = collaborationService.getUserActivities(userId);
        return ResponseEntity.ok(ApiResponse.success(activities));
    }
}
