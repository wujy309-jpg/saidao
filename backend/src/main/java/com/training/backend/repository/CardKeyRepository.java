package com.training.backend.repository;

import com.training.backend.entity.CardKey;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CardKeyRepository extends JpaRepository<CardKey, Long> {

    Optional<CardKey> findByCode(String code);

    /** 悲观锁读取卡密（兑换防并发重复核销） */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CardKey c where c.code = :code")
    Optional<CardKey> findByCodeForUpdate(@Param("code") String code);

    @Query("select c from CardKey c where (:batchNo is null or c.batchNo = :batchNo) and (:status is null or c.status = :status) order by c.id desc")
    Page<CardKey> search(@Param("batchNo") String batchNo, @Param("status") CardKey.CardStatus status, Pageable pageable);

    @Query("select c from CardKey c where c.batchNo = :batchNo order by c.id asc")
    List<CardKey> findByBatchNo(@Param("batchNo") String batchNo);

    @Query("select count(c) from CardKey c where c.batchNo = :batchNo")
    long countByBatchNo(@Param("batchNo") String batchNo);
}
