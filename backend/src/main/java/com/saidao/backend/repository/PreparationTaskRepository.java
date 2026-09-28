package com.saidao.backend.repository;

import com.saidao.backend.entity.PreparationTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PreparationTaskRepository extends JpaRepository<PreparationTask, Long> {
    
    List<PreparationTask> findByPlanIdOrderBySortOrderAsc(Long planId);
    
    long countByPlanIdAndDoneTrue(Long planId);
    
    long countByPlanId(Long planId);
    
    void deleteByPlanId(Long planId);
}
