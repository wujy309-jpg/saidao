package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.Project;
import com.training.backend.entity.Project.ProjectStatus;
import com.training.backend.entity.Project.ProjectPhase;
import com.training.backend.service.ProjectService;
import com.training.backend.service.ProjectService.ProjectStatistics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * 项目控制器
 */
@Slf4j
@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {
    
    private final ProjectService projectService;
    
    /**
     * 创建项目
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Project>> createProject(
            @RequestBody Project project,
            @RequestParam Long creatorId) {
        Project createdProject = projectService.createProject(project, creatorId);
        return ResponseEntity.ok(ApiResponse.success("项目创建成功", createdProject));
    }
    
    /**
     * 更新项目状态
     */
    @PutMapping("/{projectId}/status")
    public ResponseEntity<ApiResponse<Project>> updateProjectStatus(
            @PathVariable Long projectId,
            @RequestParam ProjectStatus status) {
        Project project = projectService.updateProjectStatus(projectId, status);
        return ResponseEntity.ok(ApiResponse.success("项目状态更新成功", project));
    }
    
    /**
     * 更新项目阶段
     */
    @PutMapping("/{projectId}/phase")
    public ResponseEntity<ApiResponse<Project>> updateProjectPhase(
            @PathVariable Long projectId,
            @RequestParam ProjectPhase phase) {
        Project project = projectService.updateProjectPhase(projectId, phase);
        return ResponseEntity.ok(ApiResponse.success("项目阶段更新成功", project));
    }
    
    /**
     * 获取项目列表
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Project>>> getProjects() {
        List<Project> projects = projectService.getProjects();
        return ResponseEntity.ok(ApiResponse.success(projects));
    }
    
    /**
     * 获取用户的项目列表
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Project>>> getUserProjects(@PathVariable Long userId) {
        List<Project> projects = projectService.getUserProjects(userId);
        return ResponseEntity.ok(ApiResponse.success(projects));
    }
    
    /**
     * 获取项目详情
     */
    @GetMapping("/{projectId}")
    public ResponseEntity<ApiResponse<Project>> getProject(@PathVariable Long projectId) {
        Optional<Project> project = projectService.getProject(projectId);
        return project.map(p -> ResponseEntity.ok(ApiResponse.success(p)))
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * 获取项目统计
     */
    @GetMapping("/{projectId}/statistics")
    public ResponseEntity<ApiResponse<ProjectStatistics>> getProjectStatistics(@PathVariable Long projectId) {
        ProjectStatistics stats = projectService.getProjectStatistics(projectId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
