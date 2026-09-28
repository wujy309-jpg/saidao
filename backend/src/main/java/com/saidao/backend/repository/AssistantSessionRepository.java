package com.saidao.backend.repository;

import com.saidao.backend.entity.AssistantSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssistantSessionRepository extends JpaRepository<AssistantSession, Long> {

    List<AssistantSession> findByUserIdOrderByUpdatedAtDesc(Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);
}
