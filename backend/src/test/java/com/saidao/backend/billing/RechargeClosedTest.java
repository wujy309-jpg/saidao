package com.saidao.backend.billing;

import com.saidao.backend.controller.TokenController;
import com.saidao.backend.dto.BillingSettingPatch;
import com.saidao.backend.entity.BillingSetting;
import com.saidao.backend.entity.TokenScene;
import com.saidao.backend.entity.User;
import com.saidao.backend.exception.TokenInsufficientException;
import com.saidao.backend.service.TokenService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 守住「非经营性备案期间不得从事有偿服务」这条合规底线。
 *
 * <p>背景见 docs/赛道-合规调研报告-2026-10.md：《互联网信息服务管理办法》第 3/11 条，
 * 非经营性 ICP 备案不得从事有偿服务。因此平台改为免费内测——积分体系保留，
 * 但「用户掏钱进来」这个动作必须在<b>服务端</b>关死，而不是只藏前端按钮。
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:saidao_recharge_closed;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
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
class RechargeClosedTest extends BillingTestSupport {

    @Autowired
    private TokenService tokenService;

    @Autowired
    private TokenController tokenController;

    @AfterEach
    void tearDown() {
        logout();
    }

    /** 把开关设成指定状态（其余字段保持不变） */
    private void setRecharge(boolean open) {
        tokenService.updateSettings(new BillingSettingPatch(
                null, null, null, open, null, null, null, null, null, null));
    }

    @Test
    @DisplayName("默认关闭：历史数据没有该列（null）也按关闭处理")
    void rechargeIsClosedByDefault() {
        BillingSetting fresh = new BillingSetting();
        assertFalse(fresh.rechargeOpen(), "新建设置必须默认关闭充值");

        fresh.setRechargeEnabled(null); // 老数据行 ALTER 后为 NULL
        assertFalse(fresh.rechargeOpen(), "NULL 必须按关闭处理");

        fresh.setRechargeEnabled(true);
        assertTrue(fresh.rechargeOpen());
    }

    @Test
    @DisplayName("关闭时下单接口被服务端直接拒绝（不是只藏前端按钮）")
    void createOrderIsRejectedWhenClosed() {
        User user = newUser("recharge_closed");
        login(user.getId());
        setRecharge(false);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> tokenController.createOrder(Map.of("packageId", 1L)));
        assertTrue(ex.getMessage().contains("暂未开放"), "应明确告知充值暂未开放，实际：" + ex.getMessage());
    }

    @Test
    @DisplayName("关闭时不下发收款码与转账说明，开放后才下发")
    void paymentInfoIsHiddenWhileClosed() {
        login(newUser("recharge_qr").getId());

        setRecharge(true);
        tokenService.updateSettings(new BillingSettingPatch(
                null, null, null, null, "转账请备注订单号",
                "https://cdn.example.com/wx.png", "https://cdn.example.com/ali.png",
                null, null, null));
        Map<String, Object> open = tokenController.settings().getBody().getData();
        assertEquals(Boolean.TRUE, open.get("rechargeEnabled"));
        assertEquals("https://cdn.example.com/wx.png", open.get("wechatQrUrl"));
        assertEquals("https://cdn.example.com/ali.png", open.get("alipayQrUrl"));
        assertEquals("转账请备注订单号", open.get("paymentNote"));

        setRecharge(false);
        Map<String, Object> closed = tokenController.settings().getBody().getData();
        assertEquals(Boolean.FALSE, closed.get("rechargeEnabled"));
        assertEquals("", closed.get("wechatQrUrl"), "关闭期间绝不能把收款码下发给用户");
        assertEquals("", closed.get("alipayQrUrl"), "关闭期间绝不能把收款码下发给用户");
        assertEquals("", closed.get("paymentNote"), "关闭期间不能再出现转账引导文案");
    }

    @Test
    @DisplayName("关闭时积分不足的提示不再引导「去充值」")
    void insufficientMessageDoesNotPointToRecharge() {
        User user = newUser("recharge_msg");
        fund(user.getId(), 0L);
        setRecharge(false);

        TokenInsufficientException ex = assertThrows(TokenInsufficientException.class,
                () -> tokenService.charge(user.getId(), TokenScene.RECOMMEND));
        assertFalse(ex.getMessage().contains("充值中心"),
                "充值已关闭，不能把用户引到一扇关着的门：" + ex.getMessage());
        assertTrue(ex.getMessage().contains("免费内测"), "应说明平台免费内测：" + ex.getMessage());

        setRecharge(true);
        TokenInsufficientException ex2 = assertThrows(TokenInsufficientException.class,
                () -> tokenService.charge(user.getId(), TokenScene.RECOMMEND));
        assertTrue(ex2.getMessage().contains("充值中心"), "开放充值后应恢复引导：" + ex2.getMessage());
    }
}
