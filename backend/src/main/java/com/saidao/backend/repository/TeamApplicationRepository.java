package com.saidao.backend.repository;

import com.saidao.backend.entity.TeamApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamApplicationRepository extends JpaRepository<TeamApplication, Long> {
    
    List<TeamApplication> findByTeamIdOrderByCreatedAtDesc(Long teamId);
    
    List<TeamApplication> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    List<TeamApplication> findByTeamIdAndStatus(Long teamId, TeamApplication.ApplicationStatus status);
    
    Optional<TeamApplication> findByTeamIdAndUserIdAndStatus(Long teamId, Long userId, TeamApplication.ApplicationStatus status);
    
    void deleteByTeamId(Long teamId);
}
