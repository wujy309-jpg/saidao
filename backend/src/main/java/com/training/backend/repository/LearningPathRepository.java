package com.training.backend.repository;

import com.training.backend.entity.LearningPath;
import com.training.backend.entity.LearningPath.PathStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 学习路径Repository
 */
@Repository
public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {
    
    List<LearningPath> findByStudentId(Long studentId);
    
    List<LearningPath> findByStudentIdAndStatus(Long studentId, PathStatus status);
    
    List<LearningPath> findByProjectId(Long projectId);
    
    @Query("SELECT lp FROM LearningPath lp WHERE lp.student.id = :studentId AND lp.status = :status")
    List<LearningPath> findByStudentIdAndStatusQuery(@Param("studentId") Long studentId, @Param("status") PathStatus status);
    
    @Query("SELECT lp FROM LearningPath lp WHERE lp.pathName LIKE %:keyword% OR lp.description LIKE %:keyword%")
    List<LearningPath> searchByKeyword(@Param("keyword") String keyword);
    
    @Query("SELECT COUNT(lp) FROM LearningPath lp WHERE lp.student.id = :studentId AND lp.status = 'COMPLETED'")
    long countCompletedByStudentId(@Param("studentId") Long studentId);
    
    @Query("SELECT AVG(lp.actualDuration) FROM LearningPath lp WHERE lp.student.id = :studentId AND lp.status = 'COMPLETED'")
    Double averageDurationByStudentId(@Param("studentId") Long studentId);
}