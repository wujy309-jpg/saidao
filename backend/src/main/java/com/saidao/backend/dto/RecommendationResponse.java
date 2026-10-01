package com.saidao.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 推荐结果响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResponse {
    
    private List<RecommendationItem> items;
    private LocalDateTime generatedAt;
    private String profileSummary;

    /** 是否走了规则兜底（上游不可用）；为 true 时本次不计费 */
    private boolean degraded;

    /** 本次实际扣除的 Token（降级为 0） */
    private long chargedTokens;

    /** 降级原因（上游错误类型） */
    private String degradedReason;
}
