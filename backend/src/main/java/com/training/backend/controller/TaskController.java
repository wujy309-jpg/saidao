package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.PageResponse;
import com.training.backend.entity.Task;
import com.training.backend.entity.Task.TaskStatus;
import com.training.backend.service.TaskService;
import com.training.backend.service.TaskService.TaskStatistics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * 任务控制器
 */
@Slf4j
@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {
    
    private final TaskService taskService;
    
    /**
     * 创建任务
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Task>> createTask(
            @RequestBody Task task,
            @RequestParam Long creatorId,
            @RequestParam(required = false) Long projectId) {
        Task createdTask = taskService.createTask(task, creatorId, projectId);
        return ResponseEntity.ok(ApiResponse.success("任务创建成功", createdTask));
    }
    
    /**
     * 分配任务
     */
    @PutMapping("/{taskId}/assign")
    public ResponseEntity<ApiResponse<Task>> assignTask(
            @PathVariable Long taskId,
            @RequestParam Long userId) {
        Task task = taskService.assignTask(taskId, userId);
        return ResponseEntity.ok(ApiResponse.success("任务分配成功", task));
    }
    
    /**
     * 提交任务
     */
    @PutMapping("/{taskId}/submit")
    public ResponseEntity<ApiResponse<Task>> submitTask(@PathVariable Long taskId) {
        Task task = taskService.submitTask(taskId);
        return ResponseEntity.ok(ApiResponse.success("任务提交成功", task));
    }
    
    /**
     * 审核任务
     */
    @PutMapping("/{taskId}/review")
    public ResponseEntity<ApiResponse<Task>> reviewTask(
            @PathVariable Long taskId,
            @RequestParam TaskStatus status,
            @RequestParam(required = false) String comment) {
        Task task = taskService.reviewTask(taskId, status, comment);
        return ResponseEntity.ok(ApiResponse.success("任务审核完成", task));
    }
    
    /**
     * 获取用户的任务列表（分页）
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<PageResponse<Task>>> getUserTasks(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Task> taskPage = taskService.getUserTasks(userId, pageable);
        PageResponse<Task> response = PageResponse.of(
                taskPage.getContent(), page, size, taskPage.getTotalElements());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 获取项目的任务列表（分页）
     */
    @GetMapping("/project/{projectId}")
    public ResponseEntity<ApiResponse<PageResponse<Task>>> getProjectTasks(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Task> taskPage = taskService.getProjectTasks(projectId, pageable);
        PageResponse<Task> response = PageResponse.of(
                taskPage.getContent(), page, size, taskPage.getTotalElements());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 删除任务
     */
    @DeleteMapping("/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable Long taskId) {
        taskService.deleteTask(taskId);
        return ResponseEntity.ok(ApiResponse.success("任务删除成功", null));
    }
    
    /**
     * 获取任务详情
     */
    @GetMapping("/{taskId}")
    public ResponseEntity<ApiResponse<Task>> getTask(@PathVariable Long taskId) {
        Optional<Task> task = taskService.getTask(taskId);
        return task.map(t -> ResponseEntity.ok(ApiResponse.success(t)))
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * 更新任务进度
     */
    @PutMapping("/{taskId}/progress")
    public ResponseEntity<ApiResponse<Task>> updateTaskProgress(
            @PathVariable Long taskId,
            @RequestParam Integer actualHours) {
        Task task = taskService.updateTaskProgress(taskId, actualHours);
        return ResponseEntity.ok(ApiResponse.success("进度更新成功", task));
    }
    
    /**
     * 获取任务统计
     */
    @GetMapping("/user/{userId}/statistics")
    public ResponseEntity<ApiResponse<TaskStatistics>> getTaskStatistics(@PathVariable Long userId) {
        TaskStatistics stats = taskService.getTaskStatistics(userId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
