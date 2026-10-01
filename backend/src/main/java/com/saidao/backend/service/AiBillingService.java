package com.saidao.backend.service;

import com.saidao.backend.billing.BillingContext;
import com.saidao.backend.billing.BillingContext.BillingSession;
import com.saidao.backend.entity.AiCallLog;
import com.saidao.backend.entity.TokenScene;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 计费决策的唯一出口：把「这次 AI 请求到底该不该收钱」收敛到一个地方。
 *
 * <p>规则：
 * <ul>
 *   <li>上游正常返回 → {@link #complete} 结算，正常收费；</li>
 *   <li>上游不可用 / 返回空 / 被业务判定为无效产出 → 释放，本次免扣（写 DEGRADED 日志）；</li>
 *   <li>抛异常 / SSE 早退 → {@link #fail} 释放（写 FAILED 日志）。</li>
 * </ul>
 * 这样「用户花了 20 Token 买到一句『AI 服务暂不可用』」在结构上不可能再发生。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiBillingService {

    private final TokenService tokenService;
    private final AiCallLogService callLogService;

    /** 预留一次 AI 调用费用，并开启本次请求的计费上下文 */
    public BillingSession begin(Long userId, TokenScene scene) {
        return attach(charge(userId, scene));
    }

    /**
     * 只预留、不绑定线程上下文（SSE 场景：扣费在主线程，真正的 LLM 调用在异步线程）。
     */
    public com.saidao.backend.billing.BillingContext.ChargeTicket charge(Long userId, TokenScene scene) {
        return tokenService.charge(userId, scene);
    }

    /**
     * 在真正干活的线程里绑定计费上下文。
     * 注意 {@code CompletableFuture.runAsync} 不传递 ThreadLocal，异步体必须自己 attach。
     */
    public BillingSession attach(com.saidao.backend.billing.BillingContext.ChargeTicket ticket) {
        return BillingContext.start(ticket);
    }

    /** 成功路径：按上下文里的降级标记决定「结算」还是「免扣」 */
    public void complete(BillingSession session) {
        if (session == null) return;
        if (session.degraded()) {
            String reason = session.degradedReason() == null ? "上游不可用" : session.degradedReason();
            boolean refunded = tokenService.release(session.ticket(), "AI 降级，本次免扣（" + reason + "）");
            callLogService.record(session, AiCallLog.CallStatus.DEGRADED, 0L, reason);
            if (refunded) {
                log.info("降级免扣 refId={} scene={} amount={} 原因={}",
                        session.ticket().refId(), session.ticket().scene(), session.ticket().amount(), reason);
            }
        } else {
            tokenService.settle(session.ticket());
            callLogService.record(session, AiCallLog.CallStatus.SUCCESS, session.ticket().amount(), null);
        }
    }

    /** 失败路径：释放预留（幂等），并留下失败日志 */
    public void fail(BillingSession session, String errorType) {
        if (session == null) return;
        boolean refunded = tokenService.release(session.ticket(),
                "调用失败自动退款（" + (errorType == null ? "未知错误" : errorType) + "）");
        callLogService.record(session, AiCallLog.CallStatus.FAILED, 0L, errorType);
        if (refunded) {
            log.info("失败退款 refId={} scene={} amount={} 原因={}",
                    session.ticket().refId(), session.ticket().scene(), session.ticket().amount(), errorType);
        }
    }

    /** 业务侧主动标记「这次产出没价值」（如换任务没换掉、AI 返回空但走了兜底） */
    public void markDegraded(String reason) {
        BillingContext.markDegraded(reason);
    }
}
