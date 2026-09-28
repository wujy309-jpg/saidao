package com.training.backend.repository;

import com.training.backend.entity.ForumReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForumReplyRepository extends JpaRepository<ForumReply, Long> {
    
    List<ForumReply> findByPostIdOrderByCreatedAtAsc(Long postId);
    
    long countByPostId(Long postId);
    
    void deleteByPostId(Long postId);
}
