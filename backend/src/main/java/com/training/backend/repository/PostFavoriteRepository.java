package com.training.backend.repository;

import com.training.backend.entity.PostFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostFavoriteRepository extends JpaRepository<PostFavorite, Long> {

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    Optional<PostFavorite> findByPostIdAndUserId(Long postId, Long userId);

    void deleteByPostIdAndUserId(Long postId, Long userId);

    void deleteByPostId(Long postId);

    List<PostFavorite> findByUserIdOrderByCreatedAtDesc(Long userId);
}
