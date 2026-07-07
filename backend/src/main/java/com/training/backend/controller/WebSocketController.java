package com.training.backend.controller;

import com.training.backend.dto.WebSocketMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketController {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public WebSocketMessage sendMessage(@Payload WebSocketMessage message) {
        message.setTimestamp(LocalDateTime.now());
        return message;
    }
    
    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public WebSocketMessage addUser(@Payload WebSocketMessage message, Principal principal) {
        message.setTimestamp(LocalDateTime.now());
        message.setContent(message.getSenderId() + " 加入了聊天");
        return message;
    }
    
    public void sendNotificationToUser(Long userId, WebSocketMessage message) {
        message.setTimestamp(LocalDateTime.now());
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                message
        );
        log.info("发送通知给用户 {}: {}", userId, message.getTitle());
    }
    
    public void sendNotificationToAll(WebSocketMessage message) {
        message.setTimestamp(LocalDateTime.now());
        messagingTemplate.convertAndSend("/topic/notifications", message);
        log.info("广播通知: {}", message.getTitle());
    }
    
    public void sendTaskUpdate(Long projectId, WebSocketMessage message) {
        message.setTimestamp(LocalDateTime.now());
        messagingTemplate.convertAndSend("/topic/project/" + projectId + "/tasks", message);
        log.info("发送任务更新到项目 {}", projectId);
    }
    
    public void sendProjectUpdate(Long projectId, WebSocketMessage message) {
        message.setTimestamp(LocalDateTime.now());
        messagingTemplate.convertAndSend("/topic/project/" + projectId, message);
        log.info("发送项目 {} 更新", projectId);
    }
}
