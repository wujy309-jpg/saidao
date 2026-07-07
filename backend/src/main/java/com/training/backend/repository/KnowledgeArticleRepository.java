package com.training.backend.repository;

import com.training.backend.entity.KnowledgeArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeArticleRepository extends JpaRepository<KnowledgeArticle, Long> {
    
    List<KnowledgeArticle> findByCategoryAndIsActiveTrueOrderByPriorityDesc(String category);
    
    List<KnowledgeArticle> findByLanguageAndIsActiveTrueOrderByPriorityDesc(String language);
    
    @Query("SELECT k FROM KnowledgeArticle k WHERE k.isActive = true AND " +
           "(LOWER(k.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(k.content) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(k.tags) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY k.priority DESC")
    List<KnowledgeArticle> searchByKeyword(@Param("keyword") String keyword);
    
    @Query("SELECT DISTINCT k.category FROM KnowledgeArticle k WHERE k.isActive = true")
    List<String> findAllCategories();
    
    @Query("SELECT DISTINCT k.language FROM KnowledgeArticle k WHERE k.isActive = true AND k.language IS NOT NULL")
    List<String> findAllLanguages();
}
