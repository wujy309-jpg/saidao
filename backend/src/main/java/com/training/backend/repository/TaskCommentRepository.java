package com.training.backend.repository;

import com.training.backend.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskCommentRepository extends JpaRepository<TaskComment, Long> {
    
    List<TaskComment> findByTaskIdAndParentIsNullOrderByCreatedAtDesc(Long taskId);
    
    List<TaskComment> findByParentIdOrderByCreatedAtAsc(Long parentId);
    
    @Query("SELECT tc FROM TaskComment tc JOIN tc.mentionedUserIds m WHERE m = :userId ORDER BY tc.createdAt DESC")
    List<TaskComment> findCommentsMentioningUser(@Param("userId") Long userId);
    
    long countByTaskId(Long taskId);
    
    @Query("SELECT tc.taskId, COUNT(tc) FROM TaskComment tc GROUP BY tc.taskId")
    List<Object[]> countCommentsByTask();
}
