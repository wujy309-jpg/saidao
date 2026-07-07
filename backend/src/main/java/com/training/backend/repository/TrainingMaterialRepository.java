package com.training.backend.repository;

import com.training.backend.entity.TrainingMaterial;
import com.training.backend.entity.TrainingMaterial.MaterialType;
import com.training.backend.entity.TrainingMaterial.MaterialStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 实训材料Repository
 */
@Repository
public interface TrainingMaterialRepository extends JpaRepository<TrainingMaterial, Long> {
    
    List<TrainingMaterial> findBySubmittedById(Long userId);
    
    List<TrainingMaterial> findByTaskId(Long taskId);
    
    List<TrainingMaterial> findByMaterialType(MaterialType materialType);
    
    List<TrainingMaterial> findByStatus(MaterialStatus status);
    
    @Query("SELECT m FROM TrainingMaterial m WHERE m.submittedBy.id = :userId AND m.status = :status")
    List<TrainingMaterial> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") MaterialStatus status);
    
    @Query("SELECT m FROM TrainingMaterial m WHERE m.task.id = :taskId AND m.materialType = :type")
    List<TrainingMaterial> findByTaskIdAndType(@Param("taskId") Long taskId, @Param("type") MaterialType type);
    
    @Query("SELECT COUNT(m) FROM TrainingMaterial m WHERE m.submittedBy.id = :userId")
    long countByUserId(@Param("userId") Long userId);
    
    @Query("SELECT m FROM TrainingMaterial m WHERE m.aiScore IS NOT NULL ORDER BY m.aiScore DESC")
    List<TrainingMaterial> findTopScoredMaterials();
}
