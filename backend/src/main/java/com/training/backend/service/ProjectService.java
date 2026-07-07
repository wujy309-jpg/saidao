package com.training.backend.service;

import com.training.backend.entity.Project;
import com.training.backend.entity.Project.ProjectStatus;
import com.training.backend.entity.Project.ProjectPhase;
import com.training.backend.entity.User;
import com.training.backend.repository.ProjectRepository;
import com.training.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * 项目服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectService {
    
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    
    /**
     * 创建项目
     */
    @Transactional
    public Project createProject(Project project, Long creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("创建者不存在"));
        
        project.setCreatedBy(creator);
        project.setStatus(ProjectStatus.PLANNING);
        project.setCurrentPhase(ProjectPhase.INITIALIZATION);
        
        Project savedProject = projectRepository.save(project);
        log.info("项目创建成功: {}", savedProject.getName());
        return savedProject;
    }
    
    /**
     * 更新项目状态
     */
    @Transactional
    public Project updateProjectStatus(Long projectId, ProjectStatus status) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("项目不存在"));
        
        project.setStatus(status);
        Project updatedProject = projectRepository.save(project);
        log.info("项目 {} 状态更新为: {}", projectId, status);
        return updatedProject;
    }
    
    /**
     * 更新项目阶段
     */
    @Transactional
    public Project updateProjectPhase(Long projectId, ProjectPhase phase) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("项目不存在"));
        
        project.setCurrentPhase(phase);
        Project updatedProject = projectRepository.save(project);
        log.info("项目 {} 阶段更新为: {}", projectId, phase);
        return updatedProject;
    }
    
    /**
     * 获取项目列表
     */
    public List<Project> getProjects() {
        return projectRepository.findAll();
    }
    
    /**
     * 获取用户的项目列表
     */
    public List<Project> getUserProjects(Long userId) {
        return projectRepository.findByCreatedById(userId);
    }
    
    /**
     * 获取项目详情
     */
    public Optional<Project> getProject(Long projectId) {
        return projectRepository.findById(projectId);
    }
    
    /**
     * 获取项目统计
     */
    public ProjectStatistics getProjectStatistics(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("项目不存在"));
        
        ProjectStatistics stats = new ProjectStatistics();
        stats.setProjectId(projectId);
        stats.setProjectName(project.getName());
        stats.setStatus(project.getStatus().getDescription());
        stats.setCurrentPhase(project.getCurrentPhase().getDescription());
        stats.setTaskCount(project.getTasks() != null ? project.getTasks().size() : 0);
        
        return stats;
    }
    
    /**
     * 项目统计内部类
     */
    @lombok.Data
    public static class ProjectStatistics {
        private Long projectId;
        private String projectName;
        private String status;
        private String currentPhase;
        private int taskCount;
    }
}
