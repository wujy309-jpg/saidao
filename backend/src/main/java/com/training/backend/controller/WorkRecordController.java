package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.WorkRecord;
import com.training.backend.service.WorkRecordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 工作记录控制器
 */
@Slf4j
@RestController
@RequestMapping("/records")
@RequiredArgsConstructor
public class WorkRecordController {
    
    private final WorkRecordService workRecordService;
    
    /**
     * 创建工作记录
     */
    @PostMapping
    public ResponseEntity<ApiResponse<WorkRecord>> createRecord(
            @RequestBody WorkRecord record,
            @RequestParam Long userId,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long taskId) {
        WorkRecord createdRecord = workRecordService.createRecord(record, userId, projectId, taskId);
        return ResponseEntity.ok(ApiResponse.success("记录创建成功", createdRecord));
    }
    
    /**
     * 更新工作记录
     */
    @PutMapping("/{recordId}")
    public ResponseEntity<ApiResponse<WorkRecord>> updateRecord(
            @PathVariable Long recordId,
            @RequestBody WorkRecord recordDetails) {
        WorkRecord updatedRecord = workRecordService.updateRecord(recordId, recordDetails);
        return ResponseEntity.ok(ApiResponse.success("记录更新成功", updatedRecord));
    }
    
    /**
     * 获取用户的所有记录
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<WorkRecord>>> getUserRecords(@PathVariable Long userId) {
        List<WorkRecord> records = workRecordService.getUserRecords(userId);
        return ResponseEntity.ok(ApiResponse.success(records));
    }
    
    /**
     * 获取用户在某项目的记录
     */
    @GetMapping("/user/{userId}/project/{projectId}")
    public ResponseEntity<ApiResponse<List<WorkRecord>>> getUserRecordsByProject(
            @PathVariable Long userId,
            @PathVariable Long projectId) {
        List<WorkRecord> records = workRecordService.getUserRecordsByProject(userId, projectId);
        return ResponseEntity.ok(ApiResponse.success(records));
    }
    
    /**
     * 获取用户某日期的记录
     */
    @GetMapping("/user/{userId}/date/{date}")
    public ResponseEntity<ApiResponse<List<WorkRecord>>> getUserRecordsByDate(
            @PathVariable Long userId,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date) {
        List<WorkRecord> records = workRecordService.getUserRecordsByDate(userId, date);
        return ResponseEntity.ok(ApiResponse.success(records));
    }
    
    /**
     * 获取用户日期范围内的记录
     */
    @GetMapping("/user/{userId}/range")
    public ResponseEntity<ApiResponse<List<WorkRecord>>> getUserRecordsByDateRange(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        List<WorkRecord> records = workRecordService.getUserRecordsByDateRange(userId, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(records));
    }
    
    /**
     * 获取用户的统计数据
     */
    @GetMapping("/statistics/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserStatistics(
            @PathVariable Long userId) {
        Map<String, Object> stats = workRecordService.getUserStatistics(userId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
    
    /**
     * 删除工作记录
     */
    @DeleteMapping("/{recordId}")
    public ResponseEntity<ApiResponse<Void>> deleteRecord(@PathVariable Long recordId) {
        workRecordService.deleteRecord(recordId);
        return ResponseEntity.ok(ApiResponse.success("记录已删除", null));
    }
}
