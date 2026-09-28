package com.saidao.backend.config;

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
    private String model = "deepseek-v4-flash";
    
    /**
     * 最大token数
     */
    private int maxTokens = 8192;
    
    /**
     * 温度参数 (0-2)
     */
    private double temperature = 0.7;
    
    /**
     * 推理强度(low/medium/high):v4-flash 为推理模型,low 可减少思考 token、降本提速
     */
    private String reasoningEffort = "low";
    
    /**
     * 是否启用
     */
    private boolean enabled = true;
}
