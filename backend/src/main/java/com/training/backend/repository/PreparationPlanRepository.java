package com.training.backend.repository;

import com.training.backend.entity.PreparationPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PreparationPlanRepository extends JpaRepository<PreparationPlan, Long> {
    
    List<PreparationPlan> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    Optional<PreparationPlan> findTopByUserIdAndCompetitionIdOrderByCreatedAtDesc(Long userId, Long competitionId);
}
