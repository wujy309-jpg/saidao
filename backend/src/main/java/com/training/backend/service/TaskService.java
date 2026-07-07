package com.training.backend.service;

import com.training.backend.entity.Task;
import com.training.backend.entity.Task.TaskStatus;
import com.training.backend.entity.Task.TaskPriority;
import com.training.backend.entity.User;
import com.training.backend.entity.Project;
import com.training.backend.repository.TaskRepository;
import com.training.backend.repository.UserRepository;
import com.training.backend.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 任务服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {
    
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    
    /**
     * 创建任务
     */
    @Transactional
    public Task createTask(Task task, Long creatorId, Long projectId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("创建者不存在"));
        
        task.setCreatedBy(creator);
        task.setStatus(TaskStatus.PENDING);
        
        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new RuntimeException("项目不存在"));
            task.setProject(project);
        }
        
        Task savedTask = taskRepository.save(task);
        log.info("任务创建成功: {}", savedTask.getTitle());
        return savedTask;
    }
    
    /**
     * 分配任务
     */
    @Transactional
    public Task assignTask(Long taskId, Long userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        task.setAssignedTo(user);
        task.setStatus(TaskStatus.IN_PROGRESS);
        task.setStartedAt(LocalDateTime.now());
        
        Task updatedTask = taskRepository.save(task);
        log.info("任务 {} 已分配给用户 {}", taskId, userId);
        return updatedTask;
    }
    
    /**
     * 提交任务
     */
    @Transactional
    public Task submitTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在"));
        
        task.setStatus(TaskStatus.SUBMITTED);
        Task updatedTask = taskRepository.save(task);
        log.info("任务 {} 已提交", taskId);
        return updatedTask;
    }
    
    /**
     * 审核任务
     */
    @Transactional
    public Task reviewTask(Long taskId, TaskStatus status, String comment) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在"));
        
        task.setStatus(status);
        if (status == TaskStatus.COMPLETED) {
            task.setCompletedAt(LocalDateTime.now());
        }
        
        Task updatedTask = taskRepository.save(task);
        log.info("任务 {} 审核完成，状态: {}", taskId, status);
        return updatedTask;
    }
    
    /**
     * 获取用户的任务列表
     */
    public List<Task> getUserTasks(Long userId) {
        return taskRepository.findByAssignedToId(userId);
    }
    
    /**
     * 获取用户的任务列表（分页）
     */
    public Page<Task> getUserTasks(Long userId, Pageable pageable) {
        return taskRepository.findByAssignedToId(userId, pageable);
    }
    
    /**
     * 获取项目的任务列表
     */
    public List<Task> getProjectTasks(Long projectId) {
        return taskRepository.findByProjectId(projectId);
    }
    
    /**
     * 获取项目的任务列表（分页）
     */
    public Page<Task> getProjectTasks(Long projectId, Pageable pageable) {
        return taskRepository.findByProjectId(projectId, pageable);
    }
    
    /**
     * 获取任务详情
     */
    public Optional<Task> getTask(Long taskId) {
        return taskRepository.findById(taskId);
    }
    
    /**
     * 更新任务进度
     */
    @Transactional
    public Task updateTaskProgress(Long taskId, Integer actualHours) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在"));
        
        task.setActualHours(actualHours);
        Task updatedTask = taskRepository.save(task);
        log.info("任务 {} 进度更新，实际工时: {}", taskId, actualHours);
        return updatedTask;
    }
    
    /**
     * 删除任务
     */
    @Transactional
    public void deleteTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在"));
        taskRepository.delete(task);
        log.info("任务已删除: {}", taskId);
    }
    
    /**
     * 获取任务统计
     */
    public TaskStatistics getTaskStatistics(Long userId) {
        long totalTasks = taskRepository.countByUserId(userId);
        long completedTasks = taskRepository.countCompletedByUserId(userId);
        long pendingTasks = taskRepository.findByUserIdAndStatus(userId, TaskStatus.PENDING).size();
        long inProgressTasks = taskRepository.findByUserIdAndStatus(userId, TaskStatus.IN_PROGRESS).size();
        
        TaskStatistics stats = new TaskStatistics();
        stats.setTotalTasks(totalTasks);
        stats.setCompletedTasks(completedTasks);
        stats.setPendingTasks(pendingTasks);
        stats.setInProgressTasks(inProgressTasks);
        stats.setCompletionRate(totalTasks > 0 ? (int) (completedTasks * 100 / totalTasks) : 0);
        
        return stats;
    }
    
    /**
     * 任务统计内部类
     */
    @lombok.Data
    public static class TaskStatistics {
        private long totalTasks;
        private long completedTasks;
        private long pendingTasks;
        private long inProgressTasks;
        private int completionRate;
    }
}
