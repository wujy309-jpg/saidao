package com.saidao.backend.repository;

import com.saidao.backend.entity.ForumReport;
import com.saidao.backend.entity.ForumReport.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForumReportRepository extends JpaRepository<ForumReport, Long> {

    List<ForumReport> findByStatusOrderByCreatedAtDesc(ReportStatus status);

    long countByPostIdAndStatus(Long postId, ReportStatus status);

    long countByReplyIdAndStatus(Long replyId, ReportStatus status);

    boolean existsByPostIdAndReporterId(Long postId, Long reporterId);

    boolean existsByReplyIdAndReporterId(Long replyId, Long reporterId);
}
