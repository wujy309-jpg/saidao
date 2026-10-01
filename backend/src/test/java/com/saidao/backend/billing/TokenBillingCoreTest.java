package com.saidao.backend.billing;

import com.saidao.backend.billing.BillingContext.ChargeTicket;
import com.saidao.backend.entity.*;
import com.saidao.backend.exception.TokenInsufficientException;
import com.saidao.backend.repository.*;
import com.saidao.backend.service.TokenService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 计费核心测试：这四条断言守的都是「钱」。
 *
 * <p>覆盖审计报告里点名的计费风险：并发扣费不超扣、释放幂等不重复退款、
 * 结算只计一次、预留超时能被补偿退回、订单确认与卡密核销的并发幂等。
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
class TokenBillingCoreTest extends BillingTestSupport {

    @Autowired
    private TokenService tokenService;

    @Autowired
    private TokenTransactionRepository transactionRepository;

    @Autowired
    private TokenChargeRepository chargeRepository;

    @Autowired
    private RechargeOrderRepository orderRepository;

    @Autowired
    private CardKeyRepository cardKeyRepository;

    @Autowired
    private com.saidao.backend.service.BillingMaintenanceService billingMaintenanceService;

    private User user;

    @BeforeEach
    void setUp() {
        user = newUser("core");
        fund(user.getId(), 200);
    }

    @AfterEach
    void tearDown() {
        logout();
    }

    /* ==================== 预留 / 结算 / 释放 ==================== */

    @Test
    @DisplayName("预留后释放：余额原路退回，且重复释放不会重复退款")
    void releaseIsIdempotent() {
        long price = tokenService.scenePrice(TokenScene.RECOMMEND);
        ChargeTicket ticket = tokenService.charge(user.getId(), TokenScene.RECOMMEND);

        assertTrue(ticket.charged());
        assertEquals(price, ticket.amount());
        assertEquals(200 - price, balanceOf(user.getId()));

        assertTrue(tokenService.release(ticket, "测试释放"), "第一次释放应真的退款");
        assertEquals(200, balanceOf(user.getId()));

        assertFalse(tokenService.release(ticket, "重复释放"), "第二次释放应被状态机挡住");
        assertEquals(200, balanceOf(user.getId()), "重复释放不得重复退款");

        long refunds = transactionRepository
                .findByUserIdOrderByCreatedAtDescIdDesc(user.getId(), PageRequest.of(0, 50))
                .getContent().stream()
                .filter(t -> t.getType() == TokenTransaction.TxType.REFUND)
                .count();
        assertEquals(1, refunds, "只应产生一条 REFUND 流水");
    }

    @Test
    @DisplayName("结算只计一次累计消耗，已结算的预留不能再释放")
    void settleCountsOnceAndBlocksRelease() {
        long price = tokenService.scenePrice(TokenScene.RECOMMEND);
        ChargeTicket ticket = tokenService.charge(user.getId(), TokenScene.RECOMMEND);

        tokenService.settle(ticket);
        tokenService.settle(ticket); // 幂等

        TokenAccount account = accountRepository.findByUserId(user.getId()).orElseThrow();
        assertEquals(price, account.getTotalConsumed(), "累计消耗只应计一次");
        assertEquals(200 - price, account.getBalance());

        assertFalse(tokenService.release(ticket, "已结算不应可退"), "已结算的预留不能释放");
        assertEquals(200 - price, balanceOf(user.getId()));
    }

    @Test
    @DisplayName("并发扣费：余额绝不会被扣成负数")
    void concurrentChargesNeverOverdraw() throws Exception {
        User poor = newUser("poor");
        long price = tokenService.scenePrice(TokenScene.RECOMMEND);
        int affordable = 3;
        fund(poor.getId(), price * affordable);

        int threads = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        List<ChargeTicket> succeeded = java.util.Collections.synchronizedList(new ArrayList<>());
        List<Throwable> failed = java.util.Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    succeeded.add(tokenService.charge(poor.getId(), TokenScene.RECOMMEND));
                } catch (Throwable t) {
                    failed.add(t);
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(60, TimeUnit.SECONDS), "并发扣费超时");
        pool.shutdownNow();

        assertEquals(affordable, succeeded.size(), "只有余额允许的次数能成功");
        assertEquals(threads - affordable, failed.size());
        assertTrue(failed.stream().allMatch(t -> t instanceof TokenInsufficientException),
                "失败原因应全部是余额不足，实际：" + failed);
        assertEquals(0, balanceOf(poor.getId()), "余额应恰好扣完，不为负");
    }

    @Test
    @DisplayName("补偿任务：进程被杀留下的「扣了没退」预留会被自动退回")
    void staleChargeIsCompensated() {
        long price = tokenService.scenePrice(TokenScene.TASK_SWAP);
        ChargeTicket ticket = tokenService.charge(user.getId(), TokenScene.TASK_SWAP);
        assertEquals(200 - price, balanceOf(user.getId()));

        // 把预留单「做旧」，模拟异步任务丢失 / 进程被杀
        TokenCharge charge = chargeRepository.findByRefId(ticket.refId()).orElseThrow();
        charge.setCreatedAt(LocalDateTime.now().minusMinutes(90));
        chargeRepository.save(charge);

        List<TokenCharge> stale = tokenService.findStaleCharges(30, 100);
        assertTrue(stale.stream().anyMatch(c -> c.getRefId().equals(ticket.refId())),
                "超时未终结的预留应被扫出来");

        assertTrue(tokenService.releaseStaleCharge(charge.getId(), "预留超时自动退回（测试）"));
        assertEquals(200, balanceOf(user.getId()), "超时预留应被退回");
        assertEquals(0, tokenService.findStaleCharges(30, 100).stream()
                .filter(c -> c.getRefId().equals(ticket.refId())).count());
    }

    /* ==================== 订单 ==================== */

    @Test
    @DisplayName("订单退款：冲正余额并留 ORDER_REFUND 流水，重复调用幂等")
    void refundOrderIsIdempotent() {
        RechargeOrder order = paidOrder(600, user.getId());
        fund(user.getId(), 600);

        RechargeOrder refunded = tokenService.refundOrder(order.getId(), "admin", "用户申请");
        assertEquals(RechargeOrder.OrderStatus.REFUNDED, refunded.getStatus());
        assertEquals(0, balanceOf(user.getId()));
        assertNotNull(refunded.getRefundedAt());

        tokenService.refundOrder(order.getId(), "admin", "重复点击");
        assertEquals(0, balanceOf(user.getId()), "重复退款不得二次冲正");

        long orderRefunds = transactionRepository
                .findByUserIdOrderByCreatedAtDescIdDesc(user.getId(), PageRequest.of(0, 50))
                .getContent().stream()
                .filter(t -> t.getType() == TokenTransaction.TxType.ORDER_REFUND)
                .count();
        assertEquals(1, orderRefunds);
    }

    @Test
    @DisplayName("订单退款：Token 已被消费时拒绝冲正，避免余额变负")
    void refundOrderRejectsWhenTokensAlreadySpent() {
        RechargeOrder order = paidOrder(600, user.getId());
        fund(user.getId(), 100);

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> tokenService.refundOrder(order.getId(), "admin", "用户申请"));
        assertTrue(e.getMessage().contains("余额"), e.getMessage());
        assertEquals(100, balanceOf(user.getId()));
        assertEquals(RechargeOrder.OrderStatus.PAID,
                orderRepository.findById(order.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("并发确认收款：只入账一次")
    void concurrentConfirmIsIdempotent() throws Exception {
        User buyer = newUser("buyer");
        RechargeOrder order = pendingOrder(1200, buyer.getId());

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    tokenService.confirmOrder(order.getId(), "admin");
                } catch (Throwable ignored) {
                    // 并发下允许状态机拒绝，关键是钱不能进两次
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(60, TimeUnit.SECONDS), "并发确认收款超时");
        pool.shutdownNow();

        assertEquals(1200, balanceOf(buyer.getId()), "只应到账一次");
        long recharges = transactionRepository
                .findByUserIdOrderByCreatedAtDescIdDesc(buyer.getId(), PageRequest.of(0, 50))
                .getContent().stream()
                .filter(t -> t.getType() == TokenTransaction.TxType.RECHARGE)
                .count();
        assertEquals(1, recharges, "只应有一条 RECHARGE 流水");
    }

    @Test
    @DisplayName("并发核销同一张卡密：只有一次成功")
    void concurrentRedeemOnlyOneSucceeds() throws Exception {
        User buyer = newUser("redeemer");
        CardKey card = new CardKey();
        card.setCode("TESTCARD" + System.nanoTime());
        card.setBatchNo("B-TEST");
        card.setTokens(500);
        card.setStatus(CardKey.CardStatus.UNUSED);
        card.setCreatedAt(LocalDateTime.now());
        card = cardKeyRepository.save(card);
        final String code = card.getCode();

        int threads = 6;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        List<Object> results = java.util.Collections.synchronizedList(new ArrayList<>());
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    results.add(tokenService.redeemCard(buyer.getId(), code));
                } catch (Throwable t) {
                    results.add(t);
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(60, TimeUnit.SECONDS), "并发核销超时");
        pool.shutdownNow();

        long ok = results.stream().filter(r -> r instanceof TokenTransaction).count();
        assertEquals(1, ok, "同一张卡密只应成功一次");
        assertEquals(500, balanceOf(buyer.getId()));
    }

    /* ==================== 对账与运营提醒 ==================== */

    @Test
    @DisplayName("对账：累计消耗 = 已结算预留合计，退款不造成统计漂移")
    void ledgerReconciles() {
        long price = tokenService.scenePrice(TokenScene.RECOMMEND);
        // 同一上下文里其他用例也产生过预留，所以按「本次增量」断言
        LocalDateTime since = LocalDateTime.now().minusMinutes(10);
        long settledBefore = tokenService.settledConsumedSince(since);
        long releasedBefore = tokenService.releasedSince(since);
        long balanceBefore = balanceOf(user.getId());

        ChargeTicket settled = tokenService.charge(user.getId(), TokenScene.RECOMMEND);
        tokenService.settle(settled);

        ChargeTicket released = tokenService.charge(user.getId(), TokenScene.RECOMMEND);
        tokenService.release(released, "测试退款");

        assertEquals(price, tokenService.settledConsumedSince(since) - settledBefore,
                "净消耗只增加一笔已结算的预留");
        assertEquals(price, tokenService.releasedSince(since) - releasedBefore,
                "被退回的金额单独统计，不计入净消耗");
        assertEquals(balanceBefore - price, balanceOf(user.getId()), "净扣费只有一笔");
    }

    @Test
    @DisplayName("待确认订单超时提醒：只有超过阈值的待确认订单会被扫出来")
    void overduePendingOrdersAreFlagged() {
        RechargeOrder stale = pendingOrder(600, user.getId());
        stale.setCreatedAt(LocalDateTime.now().minusHours(48));
        orderRepository.save(stale);
        RechargeOrder fresh = pendingOrder(600, user.getId());

        List<RechargeOrder> overdue = billingMaintenanceService.overduePendingOrders(50);
        assertTrue(overdue.stream().anyMatch(o -> o.getId().equals(stale.getId())), "48 小时前的订单应超时");
        assertFalse(overdue.stream().anyMatch(o -> o.getId().equals(fresh.getId())), "刚创建的订单不该超时");
        assertTrue(billingMaintenanceService.oldestPendingAgeMinutes(stale) > 47 * 60);
    }

    /* ==================== 工具 ==================== */

    private RechargeOrder pendingOrder(long tokens, Long buyerId) {
        RechargeOrder order = new RechargeOrder();
        order.setOrderNo("O-TEST-" + System.nanoTime());
        order.setUserId(buyerId);
        order.setPackageName("测试套餐");
        order.setPriceYuan(java.math.BigDecimal.valueOf(tokens / 100.0));
        order.setTokens(tokens);
        order.setStatus(RechargeOrder.OrderStatus.PENDING);
        order.setChannel(RechargeOrder.PayChannel.OTHER);
        order.setCreatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    private RechargeOrder paidOrder(long tokens, Long buyerId) {
        RechargeOrder order = pendingOrder(tokens, buyerId);
        order.setStatus(RechargeOrder.OrderStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        order.setPaidBy("admin");
        return orderRepository.save(order);
    }
}
