package com.saidao.backend.billing;

import com.saidao.backend.entity.TokenAccount;
import com.saidao.backend.entity.User;
import com.saidao.backend.repository.TokenAccountRepository;
import com.saidao.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

/**
 * 计费测试基类：H2 内存库 + 假 API Key（打开计费开关）。
 *
 * <p>注意不能用真实 DEEPSEEK_API_KEY：这里全部走本地断言，不发任何真实上游请求。
 */
public abstract class BillingTestSupport {

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected TokenAccountRepository accountRepository;

    protected User newUser(String prefix) {
        User user = new User();
        user.setUsername(prefix + "_" + System.nanoTime());
        user.setPassword("not-a-real-password");
        user.setName("计费测试用户");
        user.setRole(User.UserRole.STUDENT);
        return userRepository.save(user);
    }

    /** 直接把余额写到账上（测试预置，不走计费链路） */
    protected void fund(Long userId, long tokens) {
        TokenAccount account = accountRepository.findByUserId(userId).orElseGet(() -> {
            TokenAccount fresh = new TokenAccount();
            fresh.setUserId(userId);
            return fresh;
        });
        account.setBalance(tokens);
        accountRepository.save(account);
    }

    protected long balanceOf(Long userId) {
        return accountRepository.findByUserId(userId).map(TokenAccount::getBalance).orElse(0L);
    }

    /** 模拟已登录用户（切面/控制器都靠它取 userId） */
    protected void login(Long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, List.of()));
    }

    protected void logout() {
        SecurityContextHolder.clearContext();
    }
}
