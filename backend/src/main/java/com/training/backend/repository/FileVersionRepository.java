package com.training.backend.repository;

import com.training.backend.entity.FileVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileVersionRepository extends JpaRepository<FileVersion, Long> {
    
    List<FileVersion> findByMaterialIdOrderByVersionNumberDesc(Long materialId);
    
    Optional<FileVersion> findByMaterialIdAndIsCurrentTrue(Long materialId);
    
    @Query("SELECT fv FROM FileVersion fv WHERE fv.materialId = :materialId AND fv.versionNumber = :versionNumber")
    Optional<FileVersion> findByMaterialIdAndVersionNumber(@Param("materialId") Long materialId, @Param("versionNumber") Integer versionNumber);
    
    @Modifying
    @Query("UPDATE FileVersion fv SET fv.isCurrent = false WHERE fv.materialId = :materialId")
    void resetCurrentVersion(@Param("materialId") Long materialId);
    
    @Query("SELECT COALESCE(MAX(fv.versionNumber), 0) FROM FileVersion fv WHERE fv.materialId = :materialId")
    Integer getMaxVersionNumber(@Param("materialId") Long materialId);
}
