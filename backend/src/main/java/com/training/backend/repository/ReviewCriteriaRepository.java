package com.training.backend.repository;

import com.training.backend.entity.ReviewCriteria;
import com.training.backend.entity.ReviewCriteria.DifficultyLevel;
import com.training.backend.entity.ReviewCriteria.CriteriaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 评审标准Repository
 */
@Repository
public interface ReviewCriteriaRepository extends JpaRepository<ReviewCriteria, Long> {
    
    List<ReviewCriteria> findByProjectId(Long projectId);
    
    List<ReviewCriteria> findByTaskId(Long taskId);
    
    List<ReviewCriteria> findByDifficultyLevel(DifficultyLevel difficultyLevel);
    
    List<ReviewCriteria> findByCriteriaType(CriteriaType criteriaType);
    
    @Query("SELECT rc FROM ReviewCriteria rc WHERE rc.project.id = :projectId AND rc.criteriaType = :type")
    List<ReviewCriteria> findByProjectIdAndType(@Param("projectId") Long projectId, @Param("type") CriteriaType type);
    
    @Query("SELECT rc FROM ReviewCriteria rc WHERE rc.task.id = :taskId AND rc.criteriaType = :type")
    List<ReviewCriteria> findByTaskIdAndType(@Param("taskId") Long taskId, @Param("type") CriteriaType type);
    
    @Query("SELECT rc FROM ReviewCriteria rc WHERE rc.project.id = :projectId AND rc.difficultyLevel = :level")
    List<ReviewCriteria> findByProjectIdAndDifficultyLevel(@Param("projectId") Long projectId, @Param("level") DifficultyLevel level);
    
    @Query("SELECT rc FROM ReviewCriteria rc WHERE rc.name LIKE %:keyword% OR rc.description LIKE %:keyword%")
    List<ReviewCriteria> searchByKeyword(@Param("keyword") String keyword);
    
    @Query("SELECT rc FROM ReviewCriteria rc WHERE rc.project IS NULL AND rc.task IS NULL")
    List<ReviewCriteria> findGlobalCriteria();
}