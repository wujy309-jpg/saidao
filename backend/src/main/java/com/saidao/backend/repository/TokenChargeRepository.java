package com.saidao.backend.repository;

import com.saidao.backend.entity.TokenCharge;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TokenChargeRepository extends JpaRepository<TokenCharge, Long> {

    Optional<TokenCharge> findByRefId(String refId);

    /** 悲观锁读取预留单：释放/结算的状态机防并发重复退款 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from TokenCharge c where c.refId = :refId")
    Optional<TokenCharge> findByRefIdForUpdate(@Param("refId") String refId);

    long countByStatus(TokenCharge.ChargeStatus status);

    @Query("select coalesce(sum(c.amount), 0) from TokenCharge c where c.status = :status")
    long sumAmountByStatus(@Param("status") TokenCharge.ChargeStatus status);

    @Query("select coalesce(sum(c.amount), 0) from TokenCharge c where c.status = :status and c.createdAt >= :start")
    long sumAmountByStatusSince(@Param("status") TokenCharge.ChargeStatus status, @Param("start") LocalDateTime start);

    /**
     * 长期未终结的预留单（进程被杀/异步任务丢失留下的「扣了没退」），补偿任务用。
     * 枚举一律用参数传入：Hibernate 6 不接受 HQL 里嵌套枚举的全限定字面量。
     */
    @Query("""
        select c from TokenCharge c
        where c.status = :status and c.createdAt < :before
        order by c.id asc
        """)
    List<TokenCharge> findStaleCharged(@Param("status") TokenCharge.ChargeStatus status,
                                       @Param("before") LocalDateTime before,
                                       Pageable pageable);

    /** 各场景「调用次数 / 已结算笔数 / 已退回笔数」 */
    @Query("""
        select c.scene, count(c),
               coalesce(sum(case when c.status = :settled then 1 else 0 end), 0),
               coalesce(sum(case when c.status = :released then 1 else 0 end), 0)
        from TokenCharge c
        where c.createdAt >= :start
        group by c.scene
        """)
    List<Object[]> countBySceneSince(@Param("start") LocalDateTime start,
                                     @Param("settled") TokenCharge.ChargeStatus settled,
                                     @Param("released") TokenCharge.ChargeStatus released);
}
