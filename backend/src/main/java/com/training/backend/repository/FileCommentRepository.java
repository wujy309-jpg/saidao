package com.training.backend.repository;

import com.training.backend.entity.FileComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileCommentRepository extends JpaRepository<FileComment, Long> {
    
    List<FileComment> findByMaterialIdAndParentIsNullOrderByCreatedAtDesc(Long materialId);
    
    List<FileComment> findByVersionIdOrderByCreatedAtAsc(Long versionId);
    
    List<FileComment> findByParentIdOrderByCreatedAtAsc(Long parentId);
    
    long countByMaterialId(Long materialId);
}
