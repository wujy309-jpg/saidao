package com.saidao.backend.repository;

import com.saidao.backend.entity.RecommendationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecommendationRecordRepository extends JpaRepository<RecommendationRecord, Long> {
    
    List<RecommendationRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    void deleteByUserId(Long userId);
}
