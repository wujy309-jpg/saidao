package com.training.backend.repository;

import com.training.backend.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    
    List<Favorite> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    Optional<Favorite> findByUserIdAndCompetitionId(Long userId, Long competitionId);
    
    boolean existsByUserIdAndCompetitionId(Long userId, Long competitionId);
    
    void deleteByUserIdAndCompetitionId(Long userId, Long competitionId);
    
    void deleteByCompetitionId(Long competitionId);
}
