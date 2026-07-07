package com.training.backend.repository;

import com.training.backend.entity.WorkRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 工作记录Repository
 */
@Repository
public interface WorkRecordRepository extends JpaRepository<WorkRecord, Long> {
    
    /**
     * 获取用户的所有记录
     */
    List<WorkRecord> findByUserId(Long userId);
    
    /**
     * 获取用户在某项目的记录
     */
    List<WorkRecord> findByUserIdAndProjectId(Long userId, Long projectId);
    
    /**
     * 获取用户的某任务记录
     */
    List<WorkRecord> findByUserIdAndTaskId(Long userId, Long taskId);
    
    /**
     * 获取某日期的记录
     */
    List<WorkRecord> findByUserIdAndDate(Long userId, LocalDate date);
    
    /**
     * 获取日期范围内的记录
     */
    List<WorkRecord> findByUserIdAndDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
    
    /**
     * 统计用户的总工作时长
     */
    @Query("SELECT COALESCE(SUM(r.duration), 0) FROM WorkRecord r WHERE r.user.id = :userId")
    Double getTotalDurationByUserId(@Param("userId") Long userId);
    
    /**
     * 统计用户在某项目的总工作时长
     */
    @Query("SELECT COALESCE(SUM(r.duration), 0) FROM WorkRecord r WHERE r.user.id = :userId AND r.project.id = :projectId")
    Double getTotalDurationByUserIdAndProjectId(@Param("userId") Long userId, @Param("projectId") Long projectId);
    
    /**
     * 统计用户本周的记录数
     */
    @Query("SELECT COUNT(r) FROM WorkRecord r WHERE r.user.id = :userId AND r.date >= :weekStart")
    Long getWeekRecordCount(@Param("userId") Long userId, @Param("weekStart") LocalDate weekStart);
}
