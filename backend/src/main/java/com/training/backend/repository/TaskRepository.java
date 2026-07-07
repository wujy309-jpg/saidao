package com.training.backend.repository;

import com.training.backend.entity.Task;
import com.training.backend.entity.Task.TaskStatus;
import com.training.backend.entity.Task.TaskPriority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 任务Repository
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    
    List<Task> findByAssignedToId(Long userId);
    
    Page<Task> findByAssignedToId(Long userId, Pageable pageable);
    
    List<Task> findByCreatedById(Long userId);
    
    List<Task> findByProjectId(Long projectId);
    
    Page<Task> findByProjectId(Long projectId, Pageable pageable);
    
    List<Task> findByStatus(TaskStatus status);
    
    Page<Task> findByStatus(TaskStatus status, Pageable pageable);
    
    List<Task> findByPriority(TaskPriority priority);
    
    @Query("SELECT t FROM Task t WHERE t.assignedTo.id = :userId AND t.status = :status")
    List<Task> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") TaskStatus status);
    
    @Query("SELECT t FROM Task t WHERE t.project.id = :projectId AND t.status = :status")
    List<Task> findByProjectIdAndStatus(@Param("projectId") Long projectId, @Param("status") TaskStatus status);
    
    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignedTo.id = :userId AND t.status = 'COMPLETED'")
    long countCompletedByUserId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignedTo.id = :userId")
    long countByUserId(@Param("userId") Long userId);
    
    @Query("SELECT t FROM Task t WHERE t.title LIKE %:keyword% OR t.description LIKE %:keyword%")
    Page<Task> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
