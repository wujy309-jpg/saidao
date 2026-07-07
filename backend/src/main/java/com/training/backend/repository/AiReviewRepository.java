package com.training.backend.repository;

import com.training.backend.entity.AiReview;
import com.training.backend.entity.AiReview.ReviewType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * AI评审Repository
 */
@Repository
public interface AiReviewRepository extends JpaRepository<AiReview, Long> {
    
    List<AiReview> findByMaterialId(Long materialId);
    
    List<AiReview> findByReviewType(ReviewType reviewType);
    
    @Query("SELECT r FROM AiReview r WHERE r.material.id = :materialId AND r.reviewType = :type")
    Optional<AiReview> findByMaterialIdAndType(@Param("materialId") Long materialId, @Param("type") ReviewType type);
    
    @Query("SELECT AVG(r.totalScore) FROM AiReview r WHERE r.material.submittedBy.id = :userId")
    Double averageScoreByUserId(@Param("userId") Long userId);
    
    @Query("SELECT r FROM AiReview r WHERE r.totalScore >= :minScore ORDER BY r.totalScore DESC")
    List<AiReview> findHighScoreReviews(@Param("minScore") Integer minScore);
}
