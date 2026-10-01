package com.saidao.backend.repository;

import com.saidao.backend.entity.AiCallLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AiCallLogRepository extends JpaRepository<AiCallLog, Long> {

    Optional<AiCallLog> findByRefId(String refId);

    @Query("""
        select l from AiCallLog l
        where (:userId is null or l.userId = :userId)
          and (:scene is null or l.scene = :scene)
          and (:status is null or l.status = :status)
          and (:start is null or l.createdAt >= :start)
          and (:end is null or l.createdAt < :end)
        order by l.id desc
        """)
    Page<AiCallLog> search(@Param("userId") Long userId,
                           @Param("scene") String scene,
                           @Param("status") AiCallLog.CallStatus status,
                           @Param("start") LocalDateTime start,
                           @Param("end") LocalDateTime end,
                           Pageable pageable);

    /** 按场景聚合：次数、成功、降级、失败、token、耗时、成本、实收 Token */
    @Query("""
        select l.scene,
               count(l),
               coalesce(sum(case when l.status = :success then 1 else 0 end), 0),
               coalesce(sum(case when l.status = :degraded then 1 else 0 end), 0),
               coalesce(sum(case when l.status = :failed then 1 else 0 end), 0),
               coalesce(sum(l.promptTokens), 0),
               coalesce(sum(l.completionTokens), 0),
               coalesce(sum(l.latencyMs), 0),
               coalesce(sum(l.estimatedCostYuan), 0),
               coalesce(sum(l.chargedTokens), 0),
               coalesce(sum(l.llmCalls), 0)
        from AiCallLog l
        where l.createdAt >= :start and l.createdAt < :end
        group by l.scene
        """)
    List<Object[]> aggregateByScene(@Param("start") LocalDateTime start,
                                    @Param("end") LocalDateTime end,
                                    @Param("success") AiCallLog.CallStatus success,
                                    @Param("degraded") AiCallLog.CallStatus degraded,
                                    @Param("failed") AiCallLog.CallStatus failed);

    /**
     * 按天聚合（趋势）。原生 SQL + CAST(... AS DATE)：H2 与 MySQL 都支持，
     * 而 HQL 的 date()/function('date') 在不同方言下表现不一致。
     * 别名不能叫 day —— H2 里 DAY 是保留字。
     */
    @Query(value = """
        select cast(created_at as date) as bucket_date, count(*),
               coalesce(sum(prompt_tokens + completion_tokens), 0),
               coalesce(sum(estimated_cost_yuan), 0),
               coalesce(sum(charged_tokens), 0)
        from ai_call_log
        where created_at >= :start and created_at < :end
        group by cast(created_at as date)
        order by cast(created_at as date) asc
        """, nativeQuery = true)
    List<Object[]> aggregateByDay(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** 延迟样本（P95 在 Java 侧算，避免方言相关的百分位函数） */
    @Query("""
        select l.scene, l.latencyMs from AiCallLog l
        where l.createdAt >= :start and l.createdAt < :end and l.llmCalls > 0
        """)
    List<Object[]> latencySamples(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
