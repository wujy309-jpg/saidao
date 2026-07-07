package com.training.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * DeepSeek AI配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "deepseek")
public class DeepSeekConfig {
    
    /**
     * API密钥
     */
    private String apiKey;
    
    /**
     * API基础URL
     */
    private String baseUrl = "https://api.deepseek.com";
    
    /**
     * 模型名称
     */
    private String model = "deepseek-chat";
    
    /**
     * 最大token数
     */
    private int maxTokens = 2048;
    
    /**
     * 温度参数 (0-2)
     */
    private double temperature = 0.7;
    
    /**
     * 是否启用
     */
    private boolean enabled = true;
}
