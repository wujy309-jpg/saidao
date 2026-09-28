package com.saidao.backend.service;

import com.saidao.backend.entity.RefreshToken;
import com.saidao.backend.repository.RefreshTokenRepository;
import com.saidao.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {
    
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    
    @Value("${jwt.refresh-expiration:604800000}")
    private Long refreshTokenExpiration;
    
    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        refreshTokenRepository.revokeAllUserTokens(userId);
        
        RefreshToken refreshToken = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .userId(userId)
                .expiryDate(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .revoked(false)
                .build();
        
        return refreshTokenRepository.save(refreshToken);
    }
    
    @Transactional
    public RefreshToken verifyRefreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("刷新Token不存在"));
        
        if (refreshToken.getRevoked()) {
            throw new RuntimeException("刷新Token已被撤销");
        }
        
        if (refreshToken.isExpired()) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            throw new RuntimeException("刷新Token已过期");
        }
        
        return refreshToken;
    }
    
    @Transactional
    public void revokeToken(String token) {
        refreshTokenRepository.findByToken(token)
                .ifPresent(refreshToken -> {
                    refreshToken.setRevoked(true);
                    refreshTokenRepository.save(refreshToken);
                });
    }
    
    @Transactional
    public void revokeAllUserTokens(Long userId) {
        refreshTokenRepository.revokeAllUserTokens(userId);
    }
    
    @Scheduled(fixedDelay = 3600000)
    @Transactional
    public void cleanupExpiredTokens() {
        refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
        log.info("清理过期的刷新Token");
    }
}
