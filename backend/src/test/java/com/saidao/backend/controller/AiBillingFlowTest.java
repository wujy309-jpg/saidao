package com.saidao.backend.controller;

import com.saidao.backend.billing.BillingContext.ChargeTicket;
import com.saidao.backend.billing.BillingTestSupport;
import com.saidao.backend.entity.*;
import com.saidao.backend.repository.CompetitionRepository;
import com.saidao.backend.repository.TokenChargeRepository;
import com.saidao.backend.repository.TokenTransactionRepository;
import com.saidao.backend.service.AiBillingService;
import com.saidao.backend.service.DeepSeekService;
import com.saidao.backend.service.TokenService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * 计费链路的「失败/降级必须不收费」端到端测试 —— 对应审计报告的三个漏钱缺陷：
 * P0-1 推荐前置校验失败仍扣 15 Token、P0-2 SSE 早退不退、P0-3 降级仍按全价计费。
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:saidao_billing_ai;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "deepseek.enabled=true",
        "deepseek.api-key=test-fake-key-not-real",
        "deepseek.base-url=http://127.0.0.1:9"
})
class AiBillingFlowTest extends BillingTestSupport {

    @Autowired
    private RecommendationController recommendationController;

    @Autowired
    private AssistantController assistantController;

    @Autowired
    private PreparationPlanController preparationPlanController;

    @Autowired
    private ForumController forumController;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private AiBillingService aiBillingService;

    @Autowired
    private TokenTransactionRepository transactionRepository;

    @Autowired
    private TokenChargeRepository chargeRepository;

    @Autowired
    private CompetitionRepository competitionRepository;

    /** 假上游：测试不会发任何真实请求 */
    @MockBean
    private DeepSeekService deepSeekService;

    @AfterEach
    void tearDown() {
        logout();
    }

    /* ==================== P0-1：前置校验失败不得扣费 ==================== */

    @Test
    @DisplayName("P0-1 新用户没填画像就点 AI 推荐：不扣费、不留扣费流水")
    void recommendationPrecheckFailureChargesNothing() {
        User user = newUser("noprofile");
        fund(user.getId(), 100);
        login(user.getId());

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> recommendationController.generate());
        assertTrue(e.getMessage().contains("画像"), e.getMessage());

        assertEquals(100, balanceOf(user.getId()), "前置校验失败必须一分不扣");
        assertTrue(chargeRowsOf(user.getId()).isEmpty(), "不该产生任何计费预留单");
        assertTrue(consumeRowsOf(user.getId()).isEmpty(), "不该产生 CONSUME 流水");
    }

    /* ==================== P0-2：SSE 早退必须退款 ==================== */

    @Test
    @DisplayName("P0-2 续写时会话不存在：10 Token 原路退回")
    void assistantContinueEarlyReturnRefunds() {
        User user = newUser("continue");
        fund(user.getId(), 100);
        login(user.getId());

        long price = tokenService.scenePrice(TokenScene.ASSISTANT_CONTINUE);
        ChargeTicket ticket = aiBillingService.charge(user.getId(), TokenScene.ASSISTANT_CONTINUE);
        assertEquals(100 - price, balanceOf(user.getId()));

        assistantController.runContinue(ticket, user.getId(), 999_999_999L, 999_999_999L, new SseEmitter(60_000L));

        assertEquals(100, balanceOf(user.getId()), "会话不存在必须退款");
        assertEquals(1, refundRowsOf(user.getId()).size(), "应留下一条 REFUND 流水");
        assertEquals(TokenCharge.ChargeStatus.RELEASED,
                chargeRepository.findByRefId(ticket.refId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("P0-2 备赛计划流式生成失败（竞赛不存在）：PLAN_STREAM 费用退回")
    void planStreamFailureRefunds() {
        User user = newUser("planstream");
        fund(user.getId(), 200);
        login(user.getId());

        long price = tokenService.scenePrice(TokenScene.PLAN_STREAM);
        ChargeTicket ticket = aiBillingService.charge(user.getId(), TokenScene.PLAN_STREAM);
        assertEquals(200 - price, balanceOf(user.getId()));

        preparationPlanController.runGenerateStream(ticket, user.getId(), 987_654_321L,
                "冲奖", 10, List.of(), new SseEmitter(60_000L));

        assertEquals(200, balanceOf(user.getId()), "生成失败必须退款");
        assertEquals(TokenCharge.ChargeStatus.RELEASED,
                chargeRepository.findByRefId(ticket.refId()).orElseThrow().getStatus());
    }

    /* ==================== P0-3：降级必须免扣 ==================== */

    @Test
    @DisplayName("P0-3 论坛 AI 润色降级（上游不可用）：返回原文且不扣费")
    void forumPolishDegradedIsFree() {
        User user = newUser("polish");
        fund(user.getId(), 100);
        login(user.getId());
        when(deepSeekService.chat(anyString(), anyString())).thenReturn(null);

        var response = forumController.aiPolish(Map.of("content", "原始内容", "mode", "polish"));

        assertEquals("原始内容", response.getBody().getData().get("text"));
        assertEquals(100, balanceOf(user.getId()), "降级必须免扣");
        assertEquals(1, refundRowsOf(user.getId()).size());
    }

    @Test
    @DisplayName("正常返回：论坛 AI 润色按场景价扣费并结算")
    void forumPolishSuccessIsCharged() {
        User user = newUser("polishok");
        fund(user.getId(), 100);
        login(user.getId());
        when(deepSeekService.chat(anyString(), anyString())).thenReturn("润色后的内容");

        var response = forumController.aiPolish(Map.of("content", "原始内容", "mode", "polish"));

        assertEquals("润色后的内容", response.getBody().getData().get("text"));
        long price = tokenService.scenePrice(TokenScene.FORUM_POLISH);
        assertEquals(100 - price, balanceOf(user.getId()), "成功路径应正常扣费");
        assertTrue(refundRowsOf(user.getId()).isEmpty(), "成功路径不该有退款");
    }

    @Test
    @DisplayName("P0-3 备赛计划生成降级（上游返回空）：模板兜底但本次免扣")
    void planGenerateDegradedIsFree() {
        var competitions = competitionRepository.findAll();
        assertFalse(competitions.isEmpty(), "种子数据应至少有一个竞赛");
        Competition competition = competitions.get(0);

        User user = newUser("plangen");
        fund(user.getId(), 200);
        login(user.getId());
        when(deepSeekService.chat(anyString(), anyString())).thenReturn(null);

        var response = preparationPlanController.generate(Map.of(
                "competitionId", competition.getId(),
                "goal", "冲奖",
                "weeklyHours", 10));

        assertEquals(200, balanceOf(user.getId()), "模板兜底必须免扣");
        assertNotNull(response.getBody().getData(), "仍然要给用户一份可用的计划");
        assertTrue(refundRowsOf(user.getId()).size() >= 1);
    }

    /* ==================== 工具 ==================== */

    private List<TokenTransaction> rowsOf(Long userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, 100))
                .getContent();
    }

    private List<TokenTransaction> refundRowsOf(Long userId) {
        return rowsOf(userId).stream().filter(t -> t.getType() == TokenTransaction.TxType.REFUND).toList();
    }

    private List<TokenTransaction> consumeRowsOf(Long userId) {
        return rowsOf(userId).stream().filter(t -> t.getType() == TokenTransaction.TxType.CONSUME).toList();
    }

    private List<TokenCharge> chargeRowsOf(Long userId) {
        return chargeRepository.findAll().stream().filter(c -> c.getUserId().equals(userId)).toList();
    }
}
