package com.training.backend.aspect;

import com.training.backend.annotation.CostTokens;
import com.training.backend.service.TokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * AI 扣费切面：@CostTokens 标注的方法，进入前按场景扣 Token，抛异常自动退款。
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class TokenAspect {

    private final TokenService tokenService;

    @Around("@annotation(costTokens)")
    public Object around(ProceedingJoinPoint pjp, CostTokens costTokens) throws Throwable {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (auth != null && auth.getPrincipal() instanceof Long id) ? id : null;
        if (userId == null) {
            return pjp.proceed();
        }

        long amount = tokenService.consume(userId, costTokens.value(), null);
        try {
            return pjp.proceed();
        } catch (Throwable t) {
            if (amount > 0) {
                try {
                    tokenService.refund(userId, costTokens.value(), null, amount);
                } catch (Exception refundError) {
                    log.error("Token 退款失败 userId={} scene={} amount={}",
                            userId, costTokens.value(), amount, refundError);
                }
            }
            throw t;
        }
    }
}
