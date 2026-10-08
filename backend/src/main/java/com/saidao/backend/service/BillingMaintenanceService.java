package com.saidao.backend.service;

import com.saidao.backend.entity.RechargeOrder;
import com.saidao.backend.entity.TokenCharge;
import com.saidao.backend.repository.RechargeOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 计费运维任务：
 * <ol>
 *   <li><b>补偿退款</b>：把超时未终结的 AI 预留单退回（进程被杀、异步任务丢失留下的「扣了没退」）；</li>
 *   <li><b>待确认订单提醒</b>：超过阈值仍未确认收款的订单，日志告警（后台总览页同时有红条提示）。</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BillingMaintenanceService {

    private final TokenService tokenService;
    private final RechargeOrderRepository orderRepository;

    /** 预留单超过该分钟数仍未终结即视为「扣了没退」（SSE 最长 5 分钟，30 分钟足够安全） */
    @Value("${saidao.billing.stale-charge-minutes:30}")
    private int staleChargeMinutes;

    /** 单次补偿的最大笔数（防止一次拉太多） */
    @Value("${saidao.billing.stale-charge-batch:200}")
    private int staleChargeBatch;

    /** 每 10 分钟补偿一次 */
    @Scheduled(fixedDelay = 600_000L, initialDelay = 120_000L)
    public void releaseStaleCharges() {
        try {
            List<TokenCharge> stale = tokenService.findStaleCharges(staleChargeMinutes, staleChargeBatch);
            if (stale.isEmpty()) return;
            int released = 0;
            long tokens = 0;
            for (TokenCharge charge : stale) {
                try {
                    if (tokenService.releaseStaleCharge(charge.getId(), "预留超时自动退回（进程中断补偿）")) {
                        released++;
                        tokens += charge.getAmount();
                    }
                } catch (Exception e) {
                    log.error("补偿退款失败 chargeId={} refId={}: {}", charge.getId(), charge.getRefId(), e.getMessage());
                }
            }
            log.warn("计费补偿任务：发现 {} 笔未终结预留，退回 {} 笔共 {} 积分", stale.size(), released, tokens);
        } catch (Exception e) {
            log.error("计费补偿任务异常: {}", e.getMessage());
        }
    }

    /** 每 30 分钟检查一次待确认订单（阈值可在后台「平台设置」调整） */
    @Scheduled(fixedDelay = 1_800_000L, initialDelay = 180_000L)
    public void alertPendingOrders() {
        try {
            int hours = tokenService.getSettings().getPendingOrderAlertHours();
            LocalDateTime deadline = LocalDateTime.now().minusHours(Math.max(1, hours));
            List<RechargeOrder> overdue = orderRepository.findPendingCreatedBefore(
                    RechargeOrder.OrderStatus.PENDING, deadline);
            if (overdue.isEmpty()) return;
            log.warn("待确认订单提醒：{} 笔订单超过 {} 小时仍未确认收款（最早 {}，订单号 {}）",
                    overdue.size(), hours,
                    overdue.get(0).getCreatedAt(),
                    overdue.stream().limit(5).map(RechargeOrder::getOrderNo).toList());
        } catch (Exception e) {
            log.error("待确认订单检查异常: {}", e.getMessage());
        }
    }

    /** 供后台总览直接复用的超时统计 */
    public List<RechargeOrder> overduePendingOrders(int limit) {
        int hours = tokenService.getSettings().getPendingOrderAlertHours();
        LocalDateTime deadline = LocalDateTime.now().minusHours(Math.max(1, hours));
        return orderRepository.findPendingCreatedBefore(RechargeOrder.OrderStatus.PENDING, deadline)
                .stream().limit(limit).toList();
    }

    public long oldestPendingAgeMinutes(RechargeOrder order) {
        if (order == null || order.getCreatedAt() == null) return 0;
        return Duration.between(order.getCreatedAt(), LocalDateTime.now()).toMinutes();
    }
}
