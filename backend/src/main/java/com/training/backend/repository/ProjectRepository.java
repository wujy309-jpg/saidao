package com.training.backend.repository;

import com.training.backend.entity.Project;
import com.training.backend.entity.Project.ProjectStatus;
import com.training.backend.entity.Project.ProjectPhase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 项目Repository
 */
@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    
    List<Project> findByCreatedById(Long userId);
    
    List<Project> findByStatus(ProjectStatus status);
    
    List<Project> findByCurrentPhase(ProjectPhase phase);
    
    List<Project> findByStatusAndCurrentPhase(ProjectStatus status, ProjectPhase phase);
}
