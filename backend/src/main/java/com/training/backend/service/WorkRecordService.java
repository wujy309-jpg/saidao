package com.training.backend.service;

import com.training.backend.entity.WorkRecord;
import com.training.backend.entity.User;
import com.training.backend.entity.Project;
import com.training.backend.entity.Task;
import com.training.backend.repository.WorkRecordRepository;
import com.training.backend.repository.UserRepository;
import com.training.backend.repository.ProjectRepository;
import com.training.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * 工作记录服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkRecordService {
    
    private final WorkRecordRepository workRecordRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    
    /**
     * 创建工作记录
     */
    @Transactional
    public WorkRecord createRecord(WorkRecord record, Long userId, Long projectId, Long taskId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        record.setUser(user);
        
        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new RuntimeException("项目不存在"));
            record.setProject(project);
        }
        
        if (taskId != null) {
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new RuntimeException("任务不存在"));
            record.setTask(task);
        }
        
        WorkRecord savedRecord = workRecordRepository.save(record);
        log.info("工作记录创建成功: 用户={}, 日期={}, 时长={}小时", 
                user.getName(), savedRecord.getDate(), savedRecord.getDuration());
        
        return savedRecord;
    }
    
    /**
     * 更新工作记录
     */
    @Transactional
    public WorkRecord updateRecord(Long recordId, WorkRecord recordDetails) {
        WorkRecord record = workRecordRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("记录不存在"));
        
        record.setDate(recordDetails.getDate());
        record.setDuration(recordDetails.getDuration());
        record.setContent(recordDetails.getContent());
        record.setIssues(recordDetails.getIssues());
        record.setPlan(recordDetails.getPlan());
        
        return workRecordRepository.save(record);
    }
    
    /**
     * 获取用户的所有记录
     */
    public List<WorkRecord> getUserRecords(Long userId) {
        return workRecordRepository.findByUserId(userId);
    }
    
    /**
     * 获取用户在某项目的记录
     */
    public List<WorkRecord> getUserRecordsByProject(Long userId, Long projectId) {
        return workRecordRepository.findByUserIdAndProjectId(userId, projectId);
    }
    
    /**
     * 获取用户某日期的记录
     */
    public List<WorkRecord> getUserRecordsByDate(Long userId, LocalDate date) {
        return workRecordRepository.findByUserIdAndDate(userId, date);
    }
    
    /**
     * 获取用户日期范围内的记录
     */
    public List<WorkRecord> getUserRecordsByDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return workRecordRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
    }
    
    /**
     * 获取用户的统计数据
     */
    public Map<String, Object> getUserStatistics(Long userId) {
        Map<String, Object> stats = new HashMap<>();
        
        // 总记录数
        List<WorkRecord> allRecords = workRecordRepository.findByUserId(userId);
        stats.put("totalRecords", allRecords.size());
        
        // 总工作时长
        Double totalDuration = workRecordRepository.getTotalDurationByUserId(userId);
        stats.put("totalDuration", totalDuration);
        
        // 本周记录数
        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        Long weekRecords = workRecordRepository.getWeekRecordCount(userId, weekStart);
        stats.put("weekRecords", weekRecords);
        
        // 平均时长
        double avgDuration = allRecords.isEmpty() ? 0 : totalDuration / allRecords.size();
        stats.put("avgDuration", Math.round(avgDuration * 10) / 10.0);
        
        return stats;
    }
    
    /**
     * 删除工作记录
     */
    @Transactional
    public void deleteRecord(Long recordId) {
        workRecordRepository.deleteById(recordId);
        log.info("工作记录已删除: {}", recordId);
    }
}
