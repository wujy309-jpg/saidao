package com.training.backend.repository;

import com.training.backend.entity.ExcellentWork;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExcellentWorkRepository extends JpaRepository<ExcellentWork, Long> {
    
    List<ExcellentWork> findByCompetitionIdOrderBySortOrderAscYearDesc(Long competitionId);
    
    List<ExcellentWork> findByCompetitionIdOrderByYearDesc(Long competitionId);
}
