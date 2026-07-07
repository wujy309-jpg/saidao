package com.training.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {
    
    private MessageType type;
    private Long senderId;
    private Long receiverId;
    private Long projectId;
    private String title;
    private String content;
    private Object data;
    private LocalDateTime timestamp;
    
    public enum MessageType {
        NOTIFICATION,
        TASK_UPDATE,
        COMMENT,
        MENTION,
        SYSTEM
    }
}
