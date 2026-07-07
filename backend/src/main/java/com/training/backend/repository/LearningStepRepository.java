package com.training.backend.repository;

import com.training.backend.entity.LearningStep;
import com.training.backend.entity.LearningStep.StepStatus;
import com.training.backend.entity.LearningStep.StepType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 学习步骤Repository
 */
@Repository
public interface LearningStepRepository extends JpaRepository<LearningStep, Long> {
    
    List<LearningStep> findByLearningPathId(Long learningPathId);
    
    List<LearningStep> findByLearningPathIdOrderByOrderAsc(Long learningPathId);
    
    List<LearningStep> findByLearningPathIdAndStatus(Long learningPathId, StepStatus status);
    
    @Query("SELECT ls FROM LearningStep ls WHERE ls.learningPath.id = :learningPathId ORDER BY ls.order ASC")
    List<LearningStep> findByLearningPathIdOrdered(@Param("learningPathId") Long learningPathId);
    
    @Query("SELECT ls FROM LearningStep ls WHERE ls.learningPath.student.id = :studentId AND ls.status = :status")
    List<LearningStep> findByStudentIdAndStatus(@Param("studentId") Long studentId, @Param("status") StepStatus status);
    
    @Query("SELECT COUNT(ls) FROM LearningStep ls WHERE ls.learningPath.id = :learningPathId AND ls.status = 'COMPLETED'")
    long countCompletedByLearningPathId(@Param("learningPathId") Long learningPathId);
    
    @Query("SELECT ls.stepType, COUNT(ls) FROM LearningStep ls WHERE ls.learningPath.student.id = :studentId GROUP BY ls.stepType")
    List<Object[]> countByStepTypeForStudent(@Param("studentId") Long studentId);
    
    void deleteByLearningPathId(Long learningPathId);
}