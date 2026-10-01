package com.saidao.backend.dto;

/**
 * 平台设置的「部分更新」载荷：字段为 null 表示「本次不改这一项」。
 *
 * <p>此前的实现用哨兵值 -1 保护两个数字字段，其余字段（免费额度开关、收款码）无条件覆盖，
 * 导致只发 {"paymentNote":"..."} 就会清空收款码、并把免费额度总开关静默打开。
 */
public record BillingSettingPatch(
        Long dailyFreeTokens,
        Long registerBonusTokens,
        Boolean freeQuotaEnabled,
        String paymentNote,
        String wechatQrUrl,
        String alipayQrUrl,
        java.math.BigDecimal llmInputPricePerMTok,
        java.math.BigDecimal llmOutputPricePerMTok,
        Integer pendingOrderAlertHours
) {
}
