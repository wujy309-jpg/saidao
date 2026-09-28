package com.training.backend.repository;

import com.training.backend.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    
    List<Team> findByRecruitingTrueOrderByCreatedAtDesc();
    
    List<Team> findByNameContainingIgnoreCase(String name);
}
