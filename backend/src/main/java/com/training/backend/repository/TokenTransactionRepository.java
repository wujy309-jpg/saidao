package com.training.backend.repository;

import com.training.backend.entity.TokenTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface TokenTransactionRepository extends JpaRepository<TokenTransaction, Long> {

    Page<TokenTransaction> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

    /** 后台全量检索（可选过滤条件） */
    @Query("""
        select t from TokenTransaction t
        where (:userId is null or t.userId = :userId)
          and (:type is null or t.type = :type)
          and (:scene is null or t.scene = :scene)
          and (:start is null or t.createdAt >= :start)
          and (:end is null or t.createdAt < :end)
        order by t.id desc
        """)
    Page<TokenTransaction> search(
            @Param("userId") Long userId,
            @Param("type") TokenTransaction.TxType type,
            @Param("scene") String scene,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable);

    @Query("select coalesce(sum(-t.amount), 0) from TokenTransaction t where t.type = :type")
    long sumConsumedTotal(@Param("type") TokenTransaction.TxType type);

    @Query("select coalesce(sum(t.amount), 0) from TokenTransaction t where t.type = :type")
    long sumGrantedTotal(@Param("type") TokenTransaction.TxType type);

    @Query("select coalesce(sum(t.amount), 0) from TokenTransaction t where t.type in :types")
    long sumRechargedTotal(@Param("types") Collection<TokenTransaction.TxType> types);

    @Query("select coalesce(sum(-t.amount), 0) from TokenTransaction t where t.type = :type and t.createdAt >= :start")
    long sumConsumedSince(@Param("type") TokenTransaction.TxType type, @Param("start") LocalDateTime start);

    @Query("select coalesce(sum(t.amount), 0) from TokenTransaction t where t.type in :types and t.createdAt >= :start")
    long sumRechargedSince(@Param("types") Collection<TokenTransaction.TxType> types, @Param("start") LocalDateTime start);

    @Query("select count(distinct t.userId) from TokenTransaction t where t.type = :type and t.createdAt >= :start")
    long countActiveUsersSince(@Param("type") TokenTransaction.TxType type, @Param("start") LocalDateTime start);

    /** 按场景统计扣费次数（今日） */
    @Query("""
        select t.scene, count(t), coalesce(sum(-t.amount), 0)
        from TokenTransaction t
        where t.type = :type and t.createdAt >= :start
        group by t.scene
        """)
    List<Object[]> countBySceneSince(@Param("type") TokenTransaction.TxType type, @Param("start") LocalDateTime start);
}
