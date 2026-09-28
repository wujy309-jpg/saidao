package com.training.backend.repository;

import com.training.backend.entity.RechargeOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RechargeOrderRepository extends JpaRepository<RechargeOrder, Long> {

    Optional<RechargeOrder> findByOrderNo(String orderNo);

    Page<RechargeOrder> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    @Query("select o from RechargeOrder o where (:status is null or o.status = :status) order by o.id desc")
    Page<RechargeOrder> searchByStatus(@Param("status") RechargeOrder.OrderStatus status, Pageable pageable);

    /** 悲观锁读取订单（确认收款/取消的状态机防并发） */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from RechargeOrder o where o.id = :id")
    Optional<RechargeOrder> findByIdForUpdate(@Param("id") Long id);

    @Query("select coalesce(sum(o.priceYuan), 0) from RechargeOrder o where o.status = :status")
    BigDecimal sumPaidTotal(@Param("status") RechargeOrder.OrderStatus status);

    @Query("select coalesce(sum(o.priceYuan), 0) from RechargeOrder o where o.status = :status and o.paidAt >= :start")
    BigDecimal sumPaidSince(@Param("status") RechargeOrder.OrderStatus status, @Param("start") LocalDateTime start);

    @Query("select count(o) from RechargeOrder o where o.status = :status and o.paidAt >= :start")
    long countPaidSince(@Param("status") RechargeOrder.OrderStatus status, @Param("start") LocalDateTime start);

    @Query("select count(distinct o.userId) from RechargeOrder o where o.status = :status")
    long countPaidUsersTotal(@Param("status") RechargeOrder.OrderStatus status);

    @Query("select count(o) from RechargeOrder o where o.status = :status")
    long countPending(@Param("status") RechargeOrder.OrderStatus status);

    List<RechargeOrder> findTop8ByOrderByIdDesc();
}
