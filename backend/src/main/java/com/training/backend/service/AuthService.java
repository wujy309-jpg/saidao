package com.training.backend.service;

import com.training.backend.dto.ChangePasswordRequest;
import com.training.backend.dto.LoginRequest;
import com.training.backend.dto.LoginResponse;
import com.training.backend.dto.TokenRefreshResponse;
import com.training.backend.entity.RefreshToken;
import com.training.backend.entity.User;
import com.training.backend.repository.UserRepository;
import com.training.backend.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;
    
    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String username = request.getUsername();
        String ipAddress = getClientIp(httpRequest);
        
        if (loginAttemptService.isAccountLocked(username)) {
            auditService.logLogin(null, username, false, "账户已锁定");
            throw new RuntimeException("账户已锁定，请稍后再试");
        }
        
        if (loginAttemptService.isIpBlocked(ipAddress)) {
            throw new RuntimeException("IP地址已被临时封禁");
        }
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    loginAttemptService.recordAttempt(username, ipAddress, false, "用户不存在");
                    return new RuntimeException("用户名或密码错误");
                });
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            int remaining = loginAttemptService.getRemainingAttempts(username) - 1;
            loginAttemptService.recordAttempt(username, ipAddress, false, "密码错误");
            auditService.logLogin(user.getId(), username, false, "密码错误");
            throw new RuntimeException("用户名或密码错误，剩余尝试次数: " + remaining);
        }
        
        loginAttemptService.resetAttempts(username);
        loginAttemptService.recordAttempt(username, ipAddress, true, null);
        
        String token = jwtUtil.generateToken(
                user.getId(), 
                user.getUsername(), 
                user.getRole().name()
        );
        
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());
        
        auditService.logLogin(user.getId(), username, true, null);
        log.info("用户 {} 登录成功", user.getUsername());
        
        return LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .user(LoginResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .name(user.getName())
                        .role(user.getRole().name())
                        .email(user.getEmail())
                        .build())
                .build();
    }
    
    public TokenRefreshResponse refreshToken(String refreshTokenStr) {
        RefreshToken refreshToken = refreshTokenService.verifyRefreshToken(refreshTokenStr);
        
        User user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        String newToken = jwtUtil.generateToken(
                user.getId(),
                user.getUsername(),
                user.getRole().name()
        );
        
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user.getId());
        
        return TokenRefreshResponse.builder()
                .token(newToken)
                .refreshToken(newRefreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .build();
    }
    
    @Transactional
    public void logout(Long userId, String refreshTokenStr) {
        if (refreshTokenStr != null) {
            refreshTokenService.revokeToken(refreshTokenStr);
        }
        refreshTokenService.revokeAllUserTokens(userId);
        
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            auditService.logLogout(userId, user.getUsername());
        }
        
        log.info("用户 {} 登出成功", userId);
    }
    
    @Transactional
    public User register(User user, Long operatorId) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }
        
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);
        
        auditService.logCreate(operatorId, "admin", "USER", savedUser.getId(), 
                "创建用户: " + savedUser.getUsername());
        
        log.info("用户 {} 注册成功", savedUser.getUsername());
        return savedUser;
    }
    
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("原密码错误");
        }
        
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        refreshTokenService.revokeAllUserTokens(userId);
        
        auditService.logUpdate(userId, user.getUsername(), "USER", userId, "修改密码");
        log.info("用户 {} 修改密码成功", user.getUsername());
    }
    
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}
