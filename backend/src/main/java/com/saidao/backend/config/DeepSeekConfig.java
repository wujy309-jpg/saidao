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
     * 推理强度(low/high/max)：null = 不传该参数，由服务端用默认值。
     *
     * <p>2026-10-11 实测（同一备赛计划任务，各采样 2 次）：
     * 传 low → completion 2747/3685 tokens、正文 2123/2412 字；
     * 不传 → completion 953/1105 tokens、正文 2246/2635 字。
     * 不传反而便宜约 3 倍且正文更长，故默认置空。
     * 原先「low 可减少思考 token」的注释与实测相反，已更正。
     */
    private String reasoningEffort;
    
    /**
     * 是否启用
     */
    private boolean enabled = true;
}
