package com.saidao.backend.repository;

import com.saidao.backend.entity.ReplyLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReplyLikeRepository extends JpaRepository<ReplyLike, Long> {

    boolean existsByReplyIdAndUserId(Long replyId, Long userId);

    Optional<ReplyLike> findByReplyIdAndUserId(Long replyId, Long userId);

    void deleteByReplyIdAndUserId(Long replyId, Long userId);

    void deleteByReplyId(Long replyId);
}
