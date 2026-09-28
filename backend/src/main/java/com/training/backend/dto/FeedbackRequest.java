package com.training.backend.dto;

import lombok.Data;

/**
 * 推荐反馈请求
 */
@Data
public class FeedbackRequest {
    
    /** LIKE / DISLIKE */
    private String feedback;
}
