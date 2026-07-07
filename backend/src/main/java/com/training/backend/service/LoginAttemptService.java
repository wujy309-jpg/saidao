package com.training.backend.service;

import com.training.backend.entity.LoginAttempt;
import com.training.backend.repository.LoginAttemptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoginAttemptService {
    
    private final LoginAttemptRepository loginAttemptRepository;
    
    @Value("${security.login.max-attempts:5}")
    private int maxAttempts;
    
    @Value("${security.login.lock-duration-minutes:30}")
    private int lockDurationMinutes;
    
    @Value("${security.login.attempt-window-minutes:15}")
    private int attemptWindowMinutes;
    
    @Async
    public void recordAttempt(String username, String ipAddress, boolean success, String failureReason) {
        try {
            LoginAttempt attempt = LoginAttempt.builder()
                    .username(username)
                    .ipAddress(ipAddress)
                    .success(success)
                    .failureReason(failureReason)
                    .build();
            
            loginAttemptRepository.save(attempt);
        } catch (Exception e) {
            log.error("记录登录尝试失败: {}", e.getMessage());
        }
    }
    
    public boolean isAccountLocked(String username) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(lockDurationMinutes);
        long failedAttempts = loginAttemptRepository.countFailedAttemptsSince(username, since);
        return failedAttempts >= maxAttempts;
    }
    
    public boolean isIpBlocked(String ipAddress) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(attemptWindowMinutes);
        long failedAttempts = loginAttemptRepository.countFailedAttemptsByIpSince(ipAddress, since);
        return failedAttempts >= maxAttempts * 3;
    }
    
    public int getRemainingAttempts(String username) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(attemptWindowMinutes);
        long failedAttempts = loginAttemptRepository.countFailedAttemptsSince(username, since);
        return Math.max(0, (int)(maxAttempts - failedAttempts));
    }
    
    public long getFailedAttempts(String username) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(attemptWindowMinutes);
        return loginAttemptRepository.countFailedAttemptsSince(username, since);
    }
    
    public List<LoginAttempt> getRecentAttempts(String username) {
        return loginAttemptRepository.findByUsernameOrderByAttemptTimeDesc(username);
    }
    
    public void resetAttempts(String username) {
        log.info("重置用户 {} 的登录尝试记录", username);
    }
}
