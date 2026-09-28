package com.saidao.backend.repository;

import com.saidao.backend.entity.Competition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompetitionRepository extends JpaRepository<Competition, Long> {
    
    List<Competition> findByStatus(Competition.CompetitionStatus status);
    
    List<Competition> findByCategoryAndStatus(Competition.CompetitionCategory category, Competition.CompetitionStatus status);
    
    List<Competition> findByNameContainingIgnoreCase(String name);
}
