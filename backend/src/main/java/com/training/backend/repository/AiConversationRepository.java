package com.training.backend.repository;

import com.training.backend.entity.AiConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiConversationRepository extends JpaRepository<AiConversation, Long> {
    
    List<AiConversation> findByUserIdAndIsActiveTrueOrderByUpdatedAtDesc(Long userId);
    
    Optional<AiConversation> findByIdAndUserId(Long id, Long userId);
}
