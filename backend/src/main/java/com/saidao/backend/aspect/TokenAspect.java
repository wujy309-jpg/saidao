package com.saidao.backend.aspect;

import com.saidao.backend.annotation.CostTokens;
import com.saidao.backend.billing.BillingContext;
import com.saidao.backend.billing.BillingContext.BillingSession;
import com.saidao.backend.service.AiBillingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * AI 扣费切面：@CostTokens 标注的方法进入前「预留」Token，结束后按产出质量结算或释放。
 *
 * <p>与 v1 的差别：不再只看「有没有抛异常」。上游降级（返回空 / 不可用 / HTTP 非 200）会把
 * 计费上下文标记为 degraded，切面据此<b>免扣</b>；抛出异常则释放预留（退款幂等）。
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class TokenAspect {

    private final AiBillingService aiBillingService;

    @Around("@annotation(costTokens)")
    public Object around(ProceedingJoinPoint pjp, CostTokens costTokens) throws Throwable {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (auth != null && auth.getPrincipal() instanceof Long id) ? id : null;
        if (userId == null) {
            return pjp.proceed();
        }

        BillingSession session = aiBillingService.begin(userId, costTokens.value());
        try {
            Object result = pjp.proceed();
            aiBillingService.complete(session);
            return result;
        } catch (Throwable t) {
            aiBillingService.fail(session, t.getClass().getSimpleName());
            throw t;
        } finally {
            BillingContext.clear();
        }
    }
}
