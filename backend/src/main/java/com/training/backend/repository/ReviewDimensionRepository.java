package com.training.backend.repository;

import com.training.backend.entity.ReviewDimension;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 评审维度Repository
 */
@Repository
public interface ReviewDimensionRepository extends JpaRepository<ReviewDimension, Long> {
    
    List<ReviewDimension> findByCriteriaId(Long criteriaId);
    
    List<ReviewDimension> findByCriteriaIdOrderByOrderAsc(Long criteriaId);
    
    @Query("SELECT rd FROM ReviewDimension rd WHERE rd.criteria.id = :criteriaId ORDER BY rd.order ASC")
    List<ReviewDimension> findByCriteriaIdOrdered(@Param("criteriaId") Long criteriaId);
    
    @Query("SELECT rd FROM ReviewDimension rd WHERE rd.criteria.project.id = :projectId")
    List<ReviewDimension> findByProjectId(@Param("projectId") Long projectId);
    
    @Query("SELECT rd FROM ReviewDimension rd WHERE rd.criteria.task.id = :taskId")
    List<ReviewDimension> findByTaskId(@Param("taskId") Long taskId);
    
    void deleteByCriteriaId(Long criteriaId);
}