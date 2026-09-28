package com.saidao.backend.service;

import com.saidao.backend.config.DeepSeekConfig;
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

/**
 * Token 计费核心：账户/扣费/退款/免费额度/卡密核销/订单入账。
 * 所有余额变更走悲观锁 + 事务，保证并发下余额不超扣、入账不重复。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenService {

    private final TokenAccountRepository accountRepository;
    private final TokenTransactionRepository transactionRepository;
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

    @Transactional
    public BillingSetting updateSettings(BillingSetting patch) {
        BillingSetting s = getSettings();
        if (patch.getDailyFreeTokens() >= 0) s.setDailyFreeTokens(patch.getDailyFreeTokens());
        if (patch.getRegisterBonusTokens() >= 0) s.setRegisterBonusTokens(patch.getRegisterBonusTokens());
        s.setFreeQuotaEnabled(patch.isFreeQuotaEnabled());
        if (patch.getPaymentNote() != null) s.setPaymentNote(patch.getPaymentNote());
        s.setWechatQrUrl(patch.getWechatQrUrl());
        s.setAlipayQrUrl(patch.getAlipayQrUrl());
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
        log.info("用户 {} 注册赠送 {} Token", userId, s.getRegisterBonusTokens());
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

    /* ==================== 扣费与退款 ==================== */

    /**
     * AI 场景扣费：先校验后扣减。
     * @return 实际扣减数量（计费关闭/场景免费时为 0）
     * @throws TokenInsufficientException 余额不足
     */
    @Transactional
    public long consume(Long userId, TokenScene scene, String refId) {
        if (!isBillingEnabled()) return 0;
        long price = scenePrice(scene);
        if (price <= 0) return 0;

        TokenAccount account = lockAccount(userId);
        if (account.getBalance() < price) {
            throw new TokenInsufficientException(
                    "Token 余额不足（本场景需 " + price + " Token），请前往充值中心充值");
        }
        account.setBalance(account.getBalance() - price);
        account.setTotalConsumed(account.getTotalConsumed() + price);
        accountRepository.save(account);
        record(userId, TokenTransaction.TxType.CONSUME, scene.name(), -price,
                account.getBalance(), refId, scene.getLabel());
        return price;
    }

    /** 失败退款（AOP/流式接口异常时原路退回） */
    @Transactional
    public void refund(Long userId, TokenScene scene, String refId, long amount) {
        if (amount <= 0) return;
        TokenAccount account = lockAccount(userId);
        account.setBalance(account.getBalance() + amount);
        account.setTotalConsumed(Math.max(0, account.getTotalConsumed() - amount));
        accountRepository.save(account);
        record(userId, TokenTransaction.TxType.REFUND, scene.name(), amount,
                account.getBalance(), refId, "失败自动退款:" + scene.getLabel());
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
        log.info("用户 {} 兑换卡密 {} 到账 {} Token", userId, card.getCode(), card.getTokens());
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
        log.info("订单 {} 确认收款，到账 {} Token", order.getOrderNo(), order.getTokens());
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

    /* ==================== 查询 ==================== */

    public Page<TokenTransaction> myTransactions(Long userId, int page, int size) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(1, size), 100);
        return transactionRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(p, s));
    }

    /* ==================== 内部工具 ==================== */

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
