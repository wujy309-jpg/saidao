package com.saidao.backend.repository;

import com.saidao.backend.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    
    Optional<RefreshToken> findByToken(String token);
    
    @Query("SELECT r FROM RefreshToken r WHERE r.userId = :userId AND r.revoked = false AND r.expiryDate > :now")
    Optional<RefreshToken> findValidTokenByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);
    
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true WHERE r.userId = :userId")
    void revokeAllUserTokens(@Param("userId") Long userId);
    
    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiryDate < :now")
    void deleteExpiredTokens(@Param("now") LocalDateTime now);
}
