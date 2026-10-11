package com.saidao.backend.billing;

import com.saidao.backend.controller.BillingAdminController;
import com.saidao.backend.dto.BillingSettingPatch;
import com.saidao.backend.entity.BillingSetting;
import com.saidao.backend.service.TokenService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 守住「后台改一行文案」这个已经复现过的漏钱/丢收款码缺陷（审计报告 P0-8 / 验收项 C-6）。
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:saidao_billing_core;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.properties.jakarta.persistence.lock.timeout=15000",
        "deepseek.enabled=true",
        "deepseek.api-key=test-fake-key-not-real",
        "deepseek.base-url=http://127.0.0.1:9",
        "saidao.billing.stale-charge-minutes=30"
})
class BillingSettingsPartialUpdateTest extends BillingTestSupport {

    @Autowired
    private TokenService tokenService;

    @Autowired
    private BillingAdminController billingAdminController;

    @Test
    @DisplayName("只改收款说明：收款码与免费额度开关必须原样保留")
    void partialUpdateDoesNotClobberQrOrQuotaSwitch() {
        // 1) 先全量设置：关掉免费额度（成本止损开关）、放上收款码
        tokenService.updateSettings(new BillingSettingPatch(
                5L, 50L, false, true, "原说明",
                "https://cdn.example.com/wechat.png", "https://cdn.example.com/alipay.png",
                null, null, null));

        // 2) 模拟前端/脚本只提交了一个字段
        Map<String, Object> body = new HashMap<>();
        body.put("paymentNote", "只改说明文案");
        billingAdminController.updateSettings(body);

        BillingSetting after = tokenService.getSettings();
        assertEquals("只改说明文案", after.getPaymentNote());
        assertEquals("https://cdn.example.com/wechat.png", after.getWechatQrUrl(), "微信收款码不得被清空");
        assertEquals("https://cdn.example.com/alipay.png", after.getAlipayQrUrl(), "支付宝收款码不得被清空");
        assertFalse(after.isFreeQuotaEnabled(), "免费额度总开关不得被静默打开");
    }

    @Test
    @DisplayName("部分更新：显式传 false 才关闭免费额度，传 null 不生效")
    void onlyExplicitFieldsAreApplied() {
        tokenService.updateSettings(new BillingSettingPatch(
                5L, 50L, true, true, "说明", null, null, null, null, null));
        assertTrue(tokenService.getSettings().isFreeQuotaEnabled());

        billingAdminController.updateSettings(Map.of("freeQuotaEnabled", false));
        assertFalse(tokenService.getSettings().isFreeQuotaEnabled());

        billingAdminController.updateSettings(Map.of("dailyFreeTokens", 20));
        assertFalse(tokenService.getSettings().isFreeQuotaEnabled(), "改每日额度不应把开关打开");
        assertEquals(20, tokenService.getSettings().getDailyFreeTokens());

        // 收款码显式清空是允许的（管理员的明确意图）
        billingAdminController.updateSettings(Map.of("wechatQrUrl", ""));
        assertEquals("", tokenService.getSettings().getWechatQrUrl());
    }

    @Test
    @DisplayName("成本单价与订单超时阈值可后台调整，非法值不生效")
    void llmPricingAndAlertHoursAreEditable() {
        billingAdminController.updateSettings(Map.of(
                "llmInputPricePerMTok", "1.5",
                "llmOutputPricePerMTok", "6",
                "pendingOrderAlertHours", 12));

        BillingSetting s = tokenService.getSettings();
        assertEquals(0, s.getLlmInputPricePerMTok().compareTo(new java.math.BigDecimal("1.5")));
        assertEquals(0, s.getLlmOutputPricePerMTok().compareTo(new java.math.BigDecimal("6")));
        assertEquals(12, s.getPendingOrderAlertHours());

        billingAdminController.updateSettings(Map.of(
                "llmInputPricePerMTok", "-3",
                "pendingOrderAlertHours", 0));
        BillingSetting s2 = tokenService.getSettings();
        assertEquals(0, s2.getLlmInputPricePerMTok().compareTo(java.math.BigDecimal.ZERO), "负单价应被夹到 0");
        assertEquals(1, s2.getPendingOrderAlertHours(), "超时阈值至少 1 小时");
    }
}
