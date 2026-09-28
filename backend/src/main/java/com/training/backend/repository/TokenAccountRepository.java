package com.training.backend.repository;

import com.training.backend.entity.TokenAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TokenAccountRepository extends JpaRepository<TokenAccount, Long> {

    Optional<TokenAccount> findByUserId(Long userId);

    /** 悲观锁读取账户，保证并发扣费/入账下余额原子性 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TokenAccount a where a.userId = :userId")
    Optional<TokenAccount> findByUserIdForUpdate(@Param("userId") Long userId);

    @Query("select a from TokenAccount a where a.userId in :userIds")
    List<TokenAccount> findByUserIdIn(@Param("userIds") Collection<Long> userIds);
}
