package com.training.backend.service;

import com.training.backend.entity.Task;
import com.training.backend.entity.Task.TaskStatus;
import com.training.backend.entity.User;
import com.training.backend.entity.Project;
import com.training.backend.repository.TaskRepository;
import com.training.backend.repository.UserRepository;
import com.training.backend.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {
    
    @Mock
    private TaskRepository taskRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private ProjectRepository projectRepository;
    
    @InjectMocks
    private TaskService taskService;
    
    private User testUser;
    private Task testTask;
    private Project testProject;
    
    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setName("测试用户");
        
        testProject = new Project();
        testProject.setId(1L);
        testProject.setName("测试项目");
        
        testTask = new Task();
        testTask.setId(1L);
        testTask.setTitle("测试任务");
        testTask.setDescription("测试任务描述");
        testTask.setStatus(TaskStatus.PENDING);
    }
    
    @Test
    void createTask_Success() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(testUser));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
        
        Task result = taskService.createTask(testTask, 1L, null);
        
        assertNotNull(result);
        assertEquals("测试任务", result.getTitle());
        assertEquals(TaskStatus.PENDING, result.getStatus());
        verify(taskRepository).save(any(Task.class));
    }
    
    @Test
    void createTask_WithProject() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(testUser));
        when(projectRepository.findById(anyLong())).thenReturn(Optional.of(testProject));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
        
        Task result = taskService.createTask(testTask, 1L, 1L);
        
        assertNotNull(result);
        verify(projectRepository).findById(1L);
    }
    
    @Test
    void createTask_UserNotFound() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            taskService.createTask(testTask, 1L, null);
        });
        
        assertEquals("创建者不存在", exception.getMessage());
    }
    
    @Test
    void assignTask_Success() {
        when(taskRepository.findById(anyLong())).thenReturn(Optional.of(testTask));
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(testUser));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
        
        Task result = taskService.assignTask(1L, 1L);
        
        assertNotNull(result);
        assertEquals(TaskStatus.IN_PROGRESS, testTask.getStatus());
        assertNotNull(testTask.getStartedAt());
    }
    
    @Test
    void submitTask_Success() {
        when(taskRepository.findById(anyLong())).thenReturn(Optional.of(testTask));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
        
        Task result = taskService.submitTask(1L);
        
        assertNotNull(result);
        assertEquals(TaskStatus.SUBMITTED, testTask.getStatus());
    }
    
    @Test
    void reviewTask_Approve() {
        testTask.setStatus(TaskStatus.SUBMITTED);
        when(taskRepository.findById(anyLong())).thenReturn(Optional.of(testTask));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
        
        Task result = taskService.reviewTask(1L, TaskStatus.APPROVED, "审核通过");
        
        assertNotNull(result);
        assertEquals(TaskStatus.APPROVED, testTask.getStatus());
    }
    
    @Test
    void reviewTask_Reject() {
        testTask.setStatus(TaskStatus.SUBMITTED);
        when(taskRepository.findById(anyLong())).thenReturn(Optional.of(testTask));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
        
        Task result = taskService.reviewTask(1L, TaskStatus.REJECTED, "需要修改");
        
        assertNotNull(result);
        assertEquals(TaskStatus.REJECTED, testTask.getStatus());
    }
    
    @Test
    void getUserTasks_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Task> taskPage = new PageImpl<>(Arrays.asList(testTask), pageable, 1);
        
        when(taskRepository.findByAssignedToId(anyLong(), any(Pageable.class))).thenReturn(taskPage);
        
        Page<Task> result = taskService.getUserTasks(1L, pageable);
        
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
    }
    
    @Test
    void getTask_Success() {
        when(taskRepository.findById(anyLong())).thenReturn(Optional.of(testTask));
        
        Optional<Task> result = taskService.getTask(1L);
        
        assertTrue(result.isPresent());
        assertEquals("测试任务", result.get().getTitle());
    }
    
    @Test
    void getTask_NotFound() {
        when(taskRepository.findById(anyLong())).thenReturn(Optional.empty());
        
        Optional<Task> result = taskService.getTask(1L);
        
        assertFalse(result.isPresent());
    }
}
