package com.training.backend.repository;

import com.training.backend.entity.Evaluation;
import com.training.backend.entity.Evaluation.EvaluationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 评价Repository
 */
@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    
    /**
     * 获取被评价人的所有评价
     */
    List<Evaluation> findByEvaluateeId(Long evaluateeId);
    
    /**
     * 获取评价人的所有评价
     */
    List<Evaluation> findByEvaluatorId(Long evaluatorId);
    
    /**
     * 获取项目的评价
     */
    List<Evaluation> findByProjectId(Long projectId);
    
    /**
     * 获取被评价人在某项目的评价
     */
    List<Evaluation> findByEvaluateeIdAndProjectId(Long evaluateeId, Long projectId);
    
    /**
     * 按类型获取评价
     */
    List<Evaluation> findByType(EvaluationType type);
    
    /**
     * 统计用户的平均得分
     */
    @Query("SELECT AVG(e.totalScore) FROM Evaluation e WHERE e.evaluatee.id = :evaluateeId")
    Double getAverageScoreByEvaluateeId(@Param("evaluateeId") Long evaluateeId);
    
    /**
     * 统计用户在某项目的平均得分
     */
    @Query("SELECT AVG(e.totalScore) FROM Evaluation e WHERE e.evaluatee.id = :evaluateeId AND e.project.id = :projectId")
    Double getAverageScoreByEvaluateeIdAndProjectId(@Param("evaluateeId") Long evaluateeId, @Param("projectId") Long projectId);
}
