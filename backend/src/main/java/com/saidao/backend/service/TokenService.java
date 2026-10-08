package com.saidao.backend.service;

import com.saidao.backend.billing.BillingContext.ChargeTicket;
import com.saidao.backend.config.DeepSeekConfig;
import com.saidao.backend.dto.BillingSettingPatch;
import com.saidao.backend.entity.*;
import com.saidao.backend.exception.TokenInsufficientException;
import com.saidao.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Token 计费核心：账户 / 预留-结算-释放 / 免费额度 / 卡密核销 / 订单入账与退款。
 *
 * <p>计费模型（v2，替代原先的「先扣后补」）：
 * <ol>
 *   <li>{@link #charge} 预留：锁账户扣减余额，写 CONSUME 流水与 {@link TokenCharge}（ref_id 唯一）；</li>
 *   <li>{@link #settle} 结算：产出有效才把金额计入 totalConsumed —— 因此累计消耗不会有漂移；</li>
 *   <li>{@link #release} 释放：失败/降级/早退时原路退回，靠预留单状态机保证<b>幂等</b>，重复释放不会重复退款；</li>
 *   <li>{@link #releaseStale} 补偿：进程被杀留下「扣了没退」的预留单，定时任务兜底退回。</li>
 * </ol>
 * 所有余额变更走悲观锁 + 事务，并发下余额不超扣、入账不重复。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenService {

    private final TokenAccountRepository accountRepository;
    private final TokenTransactionRepository transactionRepository;
    private final TokenChargeRepository chargeRepository;
    private final TokenSceneConfigRepository sceneConfigRepository;
    private final BillingSettingRepository billingSettingRepository;
    private final RechargeOrderRepository orderRepository;
    private final CardKeyRepository cardKeyRepository;
    private final DeepSeekConfig deepSeekConfig;

    /* ==================== 账户 ==================== */

    public TokenAccount getOrCreateAccount(Long userId) {
        return accountRepository.findByUserId(userId)
                .orElseGet(() -> {
                    TokenAccount account = new TokenAccount();
                    account.setUserId(userId);
                    return accountRepository.save(account);
                });
    }

    public long getBalance(Long userId) {
        return getOrCreateAccount(userId).getBalance();
    }

    /* ==================== 全局设置 ==================== */

    public BillingSetting getSettings() {
        return billingSettingRepository.findById(1L)
                .orElseGet(() -> {
                    BillingSetting s = new BillingSetting();
                    s.setId(1L);
                    return billingSettingRepository.save(s);
                });
    }

    /**
     * 平台设置：真·部分更新。patch 中为 null 的字段一律保持原值。
     * 修复「只改文案 → 收款码被清空 + 免费额度总开关被静默打开」。
     */
    @Transactional
    public BillingSetting updateSettings(BillingSettingPatch patch) {
        BillingSetting s = getSettings();
        if (patch.dailyFreeTokens() != null) {
            s.setDailyFreeTokens(Math.max(0, patch.dailyFreeTokens()));
        }
        if (patch.registerBonusTokens() != null) {
            s.setRegisterBonusTokens(Math.max(0, patch.registerBonusTokens()));
        }
        if (patch.freeQuotaEnabled() != null) {
            s.setFreeQuotaEnabled(patch.freeQuotaEnabled());
        }
        if (patch.paymentNote() != null) {
            s.setPaymentNote(patch.paymentNote());
        }
        if (patch.wechatQrUrl() != null) {
            s.setWechatQrUrl(patch.wechatQrUrl());
        }
        if (patch.alipayQrUrl() != null) {
            s.setAlipayQrUrl(patch.alipayQrUrl());
        }
        if (patch.llmInputPricePerMTok() != null) {
            s.setLlmInputPricePerMTok(patch.llmInputPricePerMTok().max(java.math.BigDecimal.ZERO));
        }
        if (patch.llmOutputPricePerMTok() != null) {
            s.setLlmOutputPricePerMTok(patch.llmOutputPricePerMTok().max(java.math.BigDecimal.ZERO));
        }
        if (patch.pendingOrderAlertHours() != null) {
            s.setPendingOrderAlertHours(Math.max(1, patch.pendingOrderAlertHours()));
        }
        return billingSettingRepository.save(s);
    }

    /**
     * 计费是否启用：DeepSeek 未配置/禁用时免费（开发与降级环境不收费）。
     */
    public boolean isBillingEnabled() {
        return deepSeekConfig.isEnabled()
                && deepSeekConfig.getApiKey() != null
                && !deepSeekConfig.getApiKey().isBlank();
    }

    /* ==================== 场景定价 ==================== */

    public long scenePrice(TokenScene scene) {
        return sceneConfigRepository.findByScene(scene.name())
                .map(cfg -> cfg.isEnabled() ? cfg.getPrice() : 0L)
                .orElse(scene.getDefaultPrice());
    }

    /* ==================== 免费额度 ==================== */

    /** 注册赠送（注册时调用一次） */
    @Transactional
    public long grantRegisterBonus(Long userId) {
        BillingSetting s = getSettings();
        if (!s.isFreeQuotaEnabled() || s.getRegisterBonusTokens() <= 0) return 0;
        TokenAccount account = lockAccount(userId);
        // 账户首次创建才赠送（totalGranted 为 0 且从未领取过每日额度）
        if (account.getTotalGranted() > 0) return 0;
        account.setBalance(account.getBalance() + s.getRegisterBonusTokens());
        account.setTotalGranted(account.getTotalGranted() + s.getRegisterBonusTokens());
        accountRepository.save(account);
        record(userId, TokenTransaction.TxType.GRANT, null, s.getRegisterBonusTokens(),
                account.getBalance(), null, "注册赠送");
        log.info("用户 {} 注册赠送 {} 积分", userId, s.getRegisterBonusTokens());
        return s.getRegisterBonusTokens();
    }

    /** 每日免费额度（登录时调用，按天防重复） */
    @Transactional
    public long grantDailyFree(Long userId) {
        BillingSetting s = getSettings();
        if (!s.isFreeQuotaEnabled() || s.getDailyFreeTokens() <= 0) return 0;
        TokenAccount account = lockAccount(userId);
        LocalDate today = LocalDate.now();
        if (account.getLastFreeGrantDate() != null && !account.getLastFreeGrantDate().isBefore(today)) {
            return 0;
        }
        account.setBalance(account.getBalance() + s.getDailyFreeTokens());
        account.setTotalGranted(account.getTotalGranted() + s.getDailyFreeTokens());
        account.setLastFreeGrantDate(today);
        accountRepository.save(account);
        record(userId, TokenTransaction.TxType.GRANT, null, s.getDailyFreeTokens(),
                account.getBalance(), null, "每日免费额度");
        return s.getDailyFreeTokens();
    }

    /* ==================== 预留 / 结算 / 释放 ==================== */

    /**
     * 预留一次 AI 调用费用（先扣后用）。
     *
     * @return 计费票据；计费关闭或该场景免费时 amount=0、charged=false（仍带 refId 便于归因）
     * @throws TokenInsufficientException 余额不足
     */
    @Transactional
    public ChargeTicket charge(Long userId, TokenScene scene) {
        String refId = newRefId(scene);
        if (!isBillingEnabled()) {
            return ChargeTicket.free(userId, scene, refId);
        }
        long price = scenePrice(scene);
        if (price <= 0) {
            return ChargeTicket.free(userId, scene, refId);
        }

        TokenAccount account = lockAccount(userId);
        if (account.getBalance() < price) {
            throw new TokenInsufficientException(
                    "积分余额不足（本场景需 " + price + " 积分），请前往充值中心充值");
        }

        TokenCharge charge = new TokenCharge();
        charge.setRefId(refId);
        charge.setUserId(userId);
        charge.setScene(scene.name());
        charge.setAmount(price);
        charge.setStatus(TokenCharge.ChargeStatus.CHARGED);
        chargeRepository.save(charge);

        account.setBalance(account.getBalance() - price);
        accountRepository.save(account);
        record(userId, TokenTransaction.TxType.CONSUME, scene.name(), -price,
                account.getBalance(), refId, scene.getLabel());
        return new ChargeTicket(userId, scene, refId, price, true);
    }

    /** 结算：产出有效，计入累计消耗。幂等（已结算/已释放直接返回）。 */
    @Transactional
    public void settle(ChargeTicket ticket) {
        if (ticket == null || !ticket.charged()) return;
        TokenCharge charge = chargeRepository.findByRefIdForUpdate(ticket.refId()).orElse(null);
        if (charge == null) {
            log.error("结算失败：预留单不存在 refId={}", ticket.refId());
            return;
        }
        if (!charge.isOpen()) return;
        charge.setStatus(TokenCharge.ChargeStatus.SETTLED);
        charge.setFinishedAt(LocalDateTime.now());
        chargeRepository.save(charge);

        TokenAccount account = lockAccount(ticket.userId());
        account.setTotalConsumed(account.getTotalConsumed() + charge.getAmount());
        accountRepository.save(account);
    }

    /**
     * 释放：失败/降级/早退，原路退回。幂等 —— 重复调用只有第一次真正退款。
     *
     * @return true 表示本次调用真的退了款
     */
    @Transactional
    public boolean release(ChargeTicket ticket, String reason) {
        if (ticket == null || !ticket.charged()) return false;
        TokenCharge charge = chargeRepository.findByRefIdForUpdate(ticket.refId()).orElse(null);
        if (charge == null) {
            log.error("释放失败：预留单不存在 refId={}", ticket.refId());
            return false;
        }
        return releaseCharge(charge, reason);
    }

    /**
     * 补偿任务专用：按预留单 id 释放（每笔独立事务，单笔失败不影响整批）。
     */
    @Transactional
    public boolean releaseStaleCharge(Long chargeId, String reason) {
        TokenCharge charge = chargeRepository.findById(chargeId).orElse(null);
        if (charge == null) return false;
        return releaseCharge(charge, reason);
    }

    private boolean releaseCharge(TokenCharge charge, String reason) {
        if (!charge.isOpen()) {
            log.debug("释放忽略：预留单已终结 refId={} status={}", charge.getRefId(), charge.getStatus());
            return false;
        }
        String remark = (reason == null || reason.isBlank()) ? "失败自动退款" : reason;
        charge.setStatus(TokenCharge.ChargeStatus.RELEASED);
        charge.setFinishedAt(LocalDateTime.now());
        charge.setRemark(remark);
        chargeRepository.save(charge);

        TokenAccount account = lockAccount(charge.getUserId());
        account.setBalance(account.getBalance() + charge.getAmount());
        accountRepository.save(account);
        record(charge.getUserId(), TokenTransaction.TxType.REFUND, charge.getScene(), charge.getAmount(),
                account.getBalance(), charge.getRefId(), remark + ":" + sceneLabel(charge.getScene()));
        log.info("已释放预留并退款 userId={} scene={} amount={} refId={} 原因={}",
                charge.getUserId(), charge.getScene(), charge.getAmount(), charge.getRefId(), remark);
        return true;
    }

    /** 补偿任务：找出超时未终结的预留单（进程被杀 / 异步任务丢失留下的「扣了没退」） */
    @Transactional(readOnly = true)
    public List<TokenCharge> findStaleCharges(int minutesBefore, int limit) {
        LocalDateTime before = LocalDateTime.now().minusMinutes(Math.max(1, minutesBefore));
        return chargeRepository.findStaleCharged(TokenCharge.ChargeStatus.CHARGED, before,
                PageRequest.of(0, Math.max(1, limit)));
    }

    /** 管理员手动调整余额（amount 带符号） */
    @Transactional
    public void adjust(Long userId, long amount, String remark, String operator) {
        if (amount == 0) return;
        TokenAccount account = lockAccount(userId);
        if (amount < 0 && account.getBalance() < -amount) {
            throw new IllegalArgumentException("扣减超过用户当前余额（" + account.getBalance() + "）");
        }
        account.setBalance(account.getBalance() + amount);
        accountRepository.save(account);
        record(userId, TokenTransaction.TxType.ADJUST, null, amount,
                account.getBalance(), null, (remark == null || remark.isBlank() ? "管理员调整" : remark) + "（" + operator + "）");
    }

    /* ==================== 卡密核销 ==================== */

    @Transactional
    public TokenTransaction redeemCard(Long userId, String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        if (normalized.isBlank()) throw new IllegalArgumentException("请输入卡密");
        CardKey card = cardKeyRepository.findByCodeForUpdate(normalized)
                .orElseThrow(() -> new IllegalArgumentException("卡密无效，请检查后重试"));
        if (card.getStatus() != CardKey.CardStatus.UNUSED) {
            throw new IllegalArgumentException("该卡密已被使用");
        }
        card.setStatus(CardKey.CardStatus.USED);
        card.setUsedByUserId(userId);
        card.setUsedAt(LocalDateTime.now());
        cardKeyRepository.save(card);

        TokenAccount account = lockAccount(userId);
        account.setBalance(account.getBalance() + card.getTokens());
        account.setTotalRecharged(account.getTotalRecharged() + card.getTokens());
        accountRepository.save(account);
        TokenTransaction tx = record(userId, TokenTransaction.TxType.CARD, null, card.getTokens(),
                account.getBalance(), card.getBatchNo(), "卡密兑换:" + card.getCode());
        log.info("用户 {} 兑换卡密 {} 到账 {} 积分", userId, card.getCode(), card.getTokens());
        return tx;
    }

    /* ==================== 订单 ==================== */

    /** 确认收款：PENDING → PAID（幂等，悲观锁防重复入账） */
    @Transactional
    public RechargeOrder confirmOrder(Long orderId, String adminUsername) {
        RechargeOrder order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("订单不存在"));
        if (order.getStatus() == RechargeOrder.OrderStatus.PAID) {
            return order; // 幂等
        }
        if (order.getStatus() != RechargeOrder.OrderStatus.PENDING) {
            throw new IllegalArgumentException("订单状态已变更，无法确认");
        }
        order.setStatus(RechargeOrder.OrderStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        order.setPaidBy(adminUsername);
        orderRepository.save(order);

        TokenAccount account = lockAccount(order.getUserId());
        account.setBalance(account.getBalance() + order.getTokens());
        account.setTotalRecharged(account.getTotalRecharged() + order.getTokens());
        accountRepository.save(account);
        record(order.getUserId(), TokenTransaction.TxType.RECHARGE, null, order.getTokens(),
                account.getBalance(), order.getOrderNo(), "充值订单:" + order.getPackageName());
        log.info("订单 {} 确认收款，到账 {} 积分", order.getOrderNo(), order.getTokens());
        return order;
    }

    /** 取消订单：PENDING → CANCELLED */
    @Transactional
    public RechargeOrder cancelOrder(Long orderId) {
        RechargeOrder order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("订单不存在"));
        if (order.getStatus() != RechargeOrder.OrderStatus.PENDING) {
            throw new IllegalArgumentException("仅待支付订单可取消");
        }
        order.setStatus(RechargeOrder.OrderStatus.CANCELLED);
        return orderRepository.save(order);
    }

    /**
     * 订单退款：PAID → REFUNDED，冲正已到账的 Token（幂等）。
     *
     * <p>冲正要求用户余额足以覆盖本次充值（即这些 Token 基本未被消费）。
     * 若已被消费，直接冲正会把余额扣成负数，破坏「余额不可为负」的不变量；
     * 这种情况提示管理员先线下协商，再用手动调整处理差额。
     */
    @Transactional
    public RechargeOrder refundOrder(Long orderId, String adminUsername, String reason) {
        RechargeOrder order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("订单不存在"));
        if (order.getStatus() == RechargeOrder.OrderStatus.REFUNDED) {
            return order; // 幂等
        }
        if (order.getStatus() != RechargeOrder.OrderStatus.PAID) {
            throw new IllegalArgumentException("仅已到账订单可退款（当前状态：" + order.getStatus() + "）");
        }
        TokenAccount account = lockAccount(order.getUserId());
        if (account.getBalance() < order.getTokens()) {
            throw new IllegalArgumentException(String.format(
                    "用户当前余额 %d 积分，不足以冲正本次充值的 %d 积分（已消费 %d）。"
                            + "请先与用户协商，或用「手动调整」扣减差额后再退款。",
                    account.getBalance(), order.getTokens(),
                    Math.max(0, order.getTokens() - account.getBalance())));
        }
        account.setBalance(account.getBalance() - order.getTokens());
        account.setTotalRecharged(Math.max(0, account.getTotalRecharged() - order.getTokens()));
        accountRepository.save(account);

        order.setStatus(RechargeOrder.OrderStatus.REFUNDED);
        order.setRefundedAt(LocalDateTime.now());
        order.setRefundedBy(adminUsername);
        order.setRefundReason(reason == null || reason.isBlank() ? "管理员退款" : reason);
        orderRepository.save(order);

        record(order.getUserId(), TokenTransaction.TxType.ORDER_REFUND, null, -order.getTokens(),
                account.getBalance(), order.getOrderNo(),
                "订单退款:" + order.getPackageName() + "（" + adminUsername + "）");
        log.info("订单 {} 已退款，冲正 {} 积分，操作人 {}", order.getOrderNo(), order.getTokens(), adminUsername);
        return order;
    }

    /* ==================== 查询与统计 ==================== */

    public Page<TokenTransaction> myTransactions(Long userId, int page, int size) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(1, size), 100);
        return transactionRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(p, s));
    }

    /** 净消耗 = 已结算的 AI 预留合计（不会因退款而漂移） */
    public long settledConsumedSince(LocalDateTime since) {
        return chargeRepository.sumAmountByStatusSince(TokenCharge.ChargeStatus.SETTLED, since);
    }

    public long settledConsumedTotal() {
        return chargeRepository.sumAmountByStatus(TokenCharge.ChargeStatus.SETTLED);
    }

    /** 因失败/降级退回的 Token 合计 */
    public long releasedSince(LocalDateTime since) {
        return chargeRepository.sumAmountByStatusSince(TokenCharge.ChargeStatus.RELEASED, since);
    }

    /** 各场景「调用次数 / 已结算 / 已退回」 */
    public List<Object[]> chargeStatsByScene(LocalDateTime since) {
        return chargeRepository.countBySceneSince(since,
                TokenCharge.ChargeStatus.SETTLED, TokenCharge.ChargeStatus.RELEASED);
    }

    /* ==================== 内部工具 ==================== */

    private String newRefId(TokenScene scene) {
        return scene.name() + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
    }

    private String sceneLabel(String sceneName) {
        try {
            return TokenScene.valueOf(sceneName).getLabel();
        } catch (Exception e) {
            return sceneName;
        }
    }

    private TokenAccount lockAccount(Long userId) {
        return accountRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> {
                    TokenAccount account = new TokenAccount();
                    account.setUserId(userId);
                    return accountRepository.saveAndFlush(account);
                });
    }

    private TokenTransaction record(Long userId, TokenTransaction.TxType type, String scene,
                                    long amount, long balanceAfter, String refId, String remark) {
        TokenTransaction tx = new TokenTransaction();
        tx.setUserId(userId);
        tx.setType(type);
        tx.setScene(scene);
        tx.setAmount(amount);
        tx.setBalanceAfter(balanceAfter);
        tx.setRefId(refId);
        tx.setRemark(remark);
        tx.setCreatedAt(LocalDateTime.now());
        return transactionRepository.save(tx);
    }
}
