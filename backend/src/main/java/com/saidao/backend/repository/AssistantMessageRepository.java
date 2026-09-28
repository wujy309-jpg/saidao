package com.saidao.backend.repository;

import com.saidao.backend.entity.AssistantMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssistantMessageRepository extends JpaRepository<AssistantMessage, Long> {

    List<AssistantMessage> findBySessionIdOrderByIdAsc(Long sessionId);

    void deleteBySessionId(Long sessionId);
}
