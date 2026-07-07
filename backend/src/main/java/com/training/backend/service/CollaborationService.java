package com.training.backend.service;

import com.training.backend.controller.WebSocketController;
import com.training.backend.dto.WebSocketMessage;
import com.training.backend.entity.TaskActivity;
import com.training.backend.entity.TaskComment;
import com.training.backend.repository.TaskActivityRepository;
import com.training.backend.repository.TaskCommentRepository;
import com.training.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborationService {
    
    private final TaskCommentRepository commentRepository;
    private final TaskActivityRepository activityRepository;
    private final UserRepository userRepository;
    private final WebSocketController webSocketController;
    
    private static final Pattern MENTION_PATTERN = Pattern.compile("@(\\w+)");
    
    @Transactional
    public TaskComment addComment(Long taskId, Long userId, String content, Long parentId) {
        TaskComment comment = TaskComment.builder()
                .taskId(taskId)
                .userId(userId)
                .content(content)
                .build();
        
        if (parentId != null) {
            TaskComment parent = commentRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("父评论不存在"));
            comment.setParent(parent);
        }
        
        List<Long> mentionedUserIds = extractMentions(content);
        comment.setMentionedUserIds(mentionedUserIds);
        
        TaskComment savedComment = commentRepository.save(comment);
        
        logActivity(taskId, userId, TaskActivity.ActivityType.COMMENT_ADDED, 
                "添加了评论", null, content);
        
        notifyMentionedUsers(taskId, userId, mentionedUserIds, content);
        
        return savedComment;
    }
    
    public List<TaskComment> getTaskComments(Long taskId) {
        return commentRepository.findByTaskIdAndParentIsNullOrderByCreatedAtDesc(taskId);
    }
    
    public List<TaskComment> getCommentReplies(Long commentId) {
        return commentRepository.findByParentIdOrderByCreatedAtAsc(commentId);
    }
    
    public List<TaskComment> getUserMentions(Long userId) {
        return commentRepository.findCommentsMentioningUser(userId);
    }
    
    @Transactional
    public TaskComment updateComment(Long commentId, Long userId, String newContent) {
        TaskComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("评论不存在"));
        
        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("只能编辑自己的评论");
        }
        
        comment.setContent(newContent);
        comment.setIsEdited(true);
        
        return commentRepository.save(comment);
    }
    
    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        TaskComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("评论不存在"));
        
        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("只能删除自己的评论");
        }
        
        commentRepository.delete(comment);
    }
    
    @Transactional
    public void logActivity(Long taskId, Long userId, TaskActivity.ActivityType type, 
                           String description, String oldValue, String newValue) {
        TaskActivity activity = TaskActivity.builder()
                .taskId(taskId)
                .userId(userId)
                .type(type)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();
        
        activityRepository.save(activity);
    }
    
    public List<TaskActivity> getTaskActivities(Long taskId) {
        return activityRepository.findByTaskIdOrderByCreatedAtDesc(taskId);
    }
    
    public Page<TaskActivity> getTaskActivities(Long taskId, Pageable pageable) {
        return activityRepository.findByTaskIdOrderByCreatedAtDesc(taskId, pageable);
    }
    
    public List<TaskActivity> getUserActivities(Long userId) {
        return activityRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    private List<Long> extractMentions(String content) {
        List<Long> mentionedUserIds = new ArrayList<>();
        Matcher matcher = MENTION_PATTERN.matcher(content);
        
        while (matcher.find()) {
            String username = matcher.group(1);
            userRepository.findByUsername(username)
                    .ifPresent(user -> mentionedUserIds.add(user.getId()));
        }
        
        return mentionedUserIds;
    }
    
    private void notifyMentionedUsers(Long taskId, Long senderId, List<Long> mentionedUserIds, String content) {
        String senderName = userRepository.findById(senderId)
                .map(user -> user.getName())
                .orElse("用户");
        
        for (Long userId : mentionedUserIds) {
            WebSocketMessage message = WebSocketMessage.builder()
                    .type(WebSocketMessage.MessageType.MENTION)
                    .senderId(senderId)
                    .receiverId(userId)
                    .title(senderName + " 在评论中提到了你")
                    .content(content)
                    .data(taskId)
                    .build();
            
            webSocketController.sendNotificationToUser(userId, message);
        }
    }
}
