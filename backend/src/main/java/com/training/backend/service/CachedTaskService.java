package com.training.backend.service;

import com.training.backend.entity.Task;
import com.training.backend.entity.Task.TaskStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CachedTaskService {
    
    private final TaskService taskService;
    
    @Cacheable(value = "tasks", key = "'user_' + #userId + '_' + #pageable.pageNumber")
    public Page<Task> getUserTasks(Long userId, Pageable pageable) {
        return taskService.getUserTasks(userId, pageable);
    }
    
    @Cacheable(value = "tasks", key = "'project_' + #projectId + '_' + #pageable.pageNumber")
    public Page<Task> getProjectTasks(Long projectId, Pageable pageable) {
        return taskService.getProjectTasks(projectId, pageable);
    }
    
    @Cacheable(value = "tasks", key = "'task_' + #taskId")
    public Task getTaskById(Long taskId) {
        return taskService.getTask(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在"));
    }
    
    @CacheEvict(value = "tasks", allEntries = true)
    public Task createTask(Task task, Long creatorId, Long projectId) {
        return taskService.createTask(task, creatorId, projectId);
    }
    
    @CacheEvict(value = "tasks", allEntries = true)
    public Task assignTask(Long taskId, Long userId) {
        return taskService.assignTask(taskId, userId);
    }
    
    @CacheEvict(value = "tasks", allEntries = true)
    public Task submitTask(Long taskId) {
        return taskService.submitTask(taskId);
    }
    
    @CacheEvict(value = "tasks", allEntries = true)
    public Task reviewTask(Long taskId, TaskStatus status, String comment) {
        return taskService.reviewTask(taskId, status, comment);
    }
    
    @Cacheable(value = "statistics", key = "'task_stats_' + #userId")
    public Object getTaskStatistics(Long userId) {
        return taskService.getTaskStatistics(userId);
    }
}
