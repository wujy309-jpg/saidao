package com.training.backend.repository;

import com.training.backend.entity.AiMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiMessageRepository extends JpaRepository<AiMessage, Long> {
    
    List<AiMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
    
    List<AiMessage> findTop20ByConversationIdOrderByCreatedAtDesc(Long conversationId);
}
