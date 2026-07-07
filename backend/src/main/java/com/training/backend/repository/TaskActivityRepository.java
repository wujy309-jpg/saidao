package com.training.backend.repository;

import com.training.backend.entity.TaskActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskActivityRepository extends JpaRepository<TaskActivity, Long> {
    
    List<TaskActivity> findByTaskIdOrderByCreatedAtDesc(Long taskId);
    
    Page<TaskActivity> findByTaskIdOrderByCreatedAtDesc(Long taskId, Pageable pageable);
    
    List<TaskActivity> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    Page<TaskActivity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
