package com.saidao.backend.repository;

import com.saidao.backend.entity.CompetitionFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompetitionFeedbackRepository extends JpaRepository<CompetitionFeedback, Long> {
    
    List<CompetitionFeedback> findByUserId(Long userId);
    
    Optional<CompetitionFeedback> findByUserIdAndCompetitionId(Long userId, Long competitionId);
    
    boolean existsByUserIdAndCompetitionIdAndAction(Long userId, Long competitionId, CompetitionFeedback.FeedbackAction action);
}
