package com.saidao.backend.repository;

import com.saidao.backend.entity.ForumPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForumPostRepository extends JpaRepository<ForumPost, Long> {
    
    List<ForumPost> findByBoardOrderByCreatedAtDesc(ForumPost.ForumBoard board);
    
    List<ForumPost> findAllByOrderByCreatedAtDesc();
    
    List<ForumPost> findTop10ByOrderByViewCountDesc();
}
