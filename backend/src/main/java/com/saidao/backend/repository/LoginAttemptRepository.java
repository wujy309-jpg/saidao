package com.saidao.backend.repository;

import com.saidao.backend.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {
    
    @Query("SELECT COUNT(l) FROM LoginAttempt l WHERE l.username = :username AND l.success = false AND l.attemptTime >= :since")
    long countFailedAttemptsSince(@Param("username") String username, @Param("since") LocalDateTime since);
    
    @Query("SELECT COUNT(l) FROM LoginAttempt l WHERE l.ipAddress = :ipAddress AND l.success = false AND l.attemptTime >= :since")
    long countFailedAttemptsByIpSince(@Param("ipAddress") String ipAddress, @Param("since") LocalDateTime since);
    
    List<LoginAttempt> findByUsernameOrderByAttemptTimeDesc(String username);
    
    @Query("SELECT l FROM LoginAttempt l WHERE l.username = :username AND l.success = false ORDER BY l.attemptTime DESC")
    List<LoginAttempt> findFailedAttemptsByUsername(@Param("username") String username);
}
