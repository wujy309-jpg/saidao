package com.saidao.backend.service;

import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 举报集成测试：
 * 提交举报、防重复、阈值自动隐藏、管理员处理。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ForumReportIntegrationTest {

    @Autowired private ForumService forumService;
    @Autowired private ForumReportRepository reportRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ForumPostRepository postRepository;
    @Autowired private ForumReplyRepository replyRepository;

    private Long reporter1Id;
    private Long reporter2Id;
    private Long reporter3Id;
    private Long adminId;
    private Long postId;

    @BeforeEach
    void setUp() {
        List<User> reporters = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            User u = new User();
            u.setUsername("reporter" + i + "_" + System.nanoTime());
            u.setPassword("$2a$dummy");
            u.setName("举报人" + i);
            u.setRole(User.UserRole.STUDENT);
            userRepository.saveAndFlush(u);
            reporters.add(u);
        }
        reporter1Id = reporters.get(0).getId();
        reporter2Id = reporters.get(1).getId();
        reporter3Id = reporters.get(2).getId();

        User admin = new User();
        admin.setUsername("admin_" + System.nanoTime());
        admin.setPassword("$2a$dummy");
        admin.setName("管理员");
        admin.setRole(User.UserRole.ADMIN);
        userRepository.saveAndFlush(admin);
        adminId = admin.getId();

        User author = new User();
        author.setUsername("author_" + System.nanoTime());
        author.setPassword("$2a$dummy");
        author.setName("帖主");
        author.setRole(User.UserRole.STUDENT);
        userRepository.saveAndFlush(author);

        ForumPost post = new ForumPost();
        post.setAuthor(author);
        post.setBoard(ForumPost.ForumBoard.GENERAL);
        post.setTitle("被举报的帖");
        post.setContent("内容");
        postRepository.saveAndFlush(post);
        postId = post.getId();
    }

    @Test
    void submitReport_createsPendingReport() {
        ForumReport report = forumService.submitReport(
                reporter1Id, postId, null,
                ForumReport.ReportReason.SPAM, "垃圾广告");

        assertNotNull(report.getId());
        assertEquals(ForumReport.ReportStatus.PENDING, report.getStatus());
        assertEquals(reporter1Id, report.getReporterId());
        assertEquals("垃圾广告", report.getDetail());
    }

    @Test
    void submitReport_duplicateThrowsException() {
        forumService.submitReport(reporter1Id, postId, null,
                ForumReport.ReportReason.SPAM, "第一次举报");

        assertThrows(RuntimeException.class, () -> forumService.submitReport(
                reporter1Id, postId, null,
                ForumReport.ReportReason.ABUSE, "第二次举报"),
                "同一用户重复举报应抛异常");
    }

    @Test
    void submitReport_nullTargetThrowsException() {
        assertThrows(RuntimeException.class, () -> forumService.submitReport(
                reporter1Id, null, null,
                ForumReport.ReportReason.OTHER, "无目标"),
                "postId 和 replyId 都为 null 应抛异常");
    }

    @Test
    void thresholdAutoHides_afterThreePendingReports() {
        // 第 1 举报
        forumService.submitReport(reporter1Id, postId, null,
                ForumReport.ReportReason.SPAM, "举报1");
        ForumPost post = postRepository.findById(postId).orElseThrow();
        assertFalse(Boolean.TRUE.equals(post.getHidden()), "1 次举报不应隐藏");

        // 第 2 举报
        forumService.submitReport(reporter2Id, postId, null,
                ForumReport.ReportReason.ABUSE, "举报2");
        post = postRepository.findById(postId).orElseThrow();
        assertFalse(Boolean.TRUE.equals(post.getHidden()), "2 次举报不应隐藏");

        // 第 3 举报 → 达阈值自动隐藏
        forumService.submitReport(reporter3Id, postId, null,
                ForumReport.ReportReason.FRAUD, "举报3");
        post = postRepository.findById(postId).orElseThrow();
        assertTrue(Boolean.TRUE.equals(post.getHidden()), "3 次举报应自动隐藏");
    }

    @Test
    void handleReport_approved_hidesContent() {
        // 先提交一个举报
        ForumReport report = forumService.submitReport(reporter1Id, postId, null,
                ForumReport.ReportReason.SPAM, "垃圾广告");

        // 管理员审核通过
        ForumReport handled = forumService.handleReport(report.getId(), adminId,
                ForumReport.ReportStatus.APPROVED);

        assertEquals(ForumReport.ReportStatus.APPROVED, handled.getStatus());
        assertEquals(adminId, handled.getHandlerId());
        assertNotNull(handled.getHandledAt());

        // 帖子应被隐藏
        ForumPost post = postRepository.findById(postId).orElseThrow();
        assertTrue(Boolean.TRUE.equals(post.getHidden()));
    }

    @Test
    void handleReport_rejected_doesNotHideContent() {
        ForumReport report = forumService.submitReport(reporter1Id, postId, null,
                ForumReport.ReportReason.ABUSE, "滥用");

        ForumReport handled = forumService.handleReport(report.getId(), adminId,
                ForumReport.ReportStatus.REJECTED);

        assertEquals(ForumReport.ReportStatus.REJECTED, handled.getStatus());

        ForumPost post = postRepository.findById(postId).orElseThrow();
        assertFalse(Boolean.TRUE.equals(post.getHidden()), "驳回不应隐藏内容");
    }

    @Test
    void listReports_byStatus() {
        forumService.submitReport(reporter1Id, postId, null,
                ForumReport.ReportReason.SPAM, "举报1");
        ForumReport r2 = forumService.submitReport(reporter2Id, postId, null,
                ForumReport.ReportReason.ABUSE, "举报2");
        forumService.handleReport(r2.getId(), adminId, ForumReport.ReportStatus.APPROVED);

        List<ForumReport> pending = forumService.listReports(ForumReport.ReportStatus.PENDING);
        assertEquals(1, pending.size());
        assertEquals(reporter1Id, pending.get(0).getReporterId());

        List<ForumReport> approved = forumService.listReports(ForumReport.ReportStatus.APPROVED);
        assertEquals(1, approved.size());
    }

    @Test
    void submitReport_replyReport_works() {
        // 创建一条回复
        ForumReply reply = new ForumReply();
        reply.setPost(postRepository.findById(postId).orElseThrow());
        reply.setAuthor(userRepository.findById(reporter1Id).orElseThrow());
        reply.setContent("被举报的回复");
        replyRepository.saveAndFlush(reply);

        ForumReport report = forumService.submitReport(
                reporter2Id, null, reply.getId(),
                ForumReport.ReportReason.ABUSE, "辱骂");

        assertNotNull(report.getId());
        assertEquals(reply.getId(), report.getReplyId());
        assertNull(report.getPostId());
    }
}
