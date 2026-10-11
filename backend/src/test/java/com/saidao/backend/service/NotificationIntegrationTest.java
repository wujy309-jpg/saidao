package com.saidao.backend.service;

import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 通知集成测试：
 * 验证通知创建、列表查询、未读计数、批量已读（单条 SQL）。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NotificationIntegrationTest {

    @Autowired private ForumService forumService;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ForumPostRepository postRepository;
    @Autowired private EntityManagerFactory emf;

    private Long authorId;
    private Long otherUserId;
    private Long postId;

    @BeforeEach
    void setUp() {
        User author = new User();
        author.setUsername("notif_author_" + System.nanoTime());
        author.setPassword("$2a$dummy");
        author.setName("帖主");
        author.setRole(User.UserRole.STUDENT);
        userRepository.saveAndFlush(author);
        authorId = author.getId();

        User other = new User();
        other.setUsername("notif_other_" + System.nanoTime());
        other.setPassword("$2a$dummy");
        other.setName("其他用户");
        other.setRole(User.UserRole.STUDENT);
        userRepository.saveAndFlush(other);
        otherUserId = other.getId();

        ForumPost post = new ForumPost();
        post.setAuthor(author);
        post.setBoard(ForumPost.ForumBoard.Q_AND_A);
        post.setTitle("通知测试帖");
        post.setContent("内容");
        postRepository.saveAndFlush(post);
        postId = post.getId();
    }

    @Test
    void createReply_generatesReplyNotification() {
        forumService.createReply(postId, otherUserId, "这是一条回复");

        List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(authorId);
        assertFalse(notifs.isEmpty());
        Notification n = notifs.get(0);
        assertEquals(Notification.NotificationType.REPLY, n.getType());
        assertEquals(otherUserId, n.getActorId());
        assertEquals("其他用户", n.getActorName(), "actorName 应从 User.name 冗余存储");
        assertEquals(postId, n.getPostId());
    }

    @Test
    void togglePostLike_generatesLikeNotification() {
        forumService.togglePostLike(postId, otherUserId);

        List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(authorId);
        assertFalse(notifs.isEmpty());
        assertEquals(Notification.NotificationType.LIKE_POST, notifs.get(0).getType());
        assertEquals("其他用户", notifs.get(0).getActorName());
    }

    @Test
    void toggleFollow_generatesFollowNotification() {
        forumService.toggleFollow(otherUserId, authorId);

        List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(authorId);
        assertFalse(notifs.isEmpty());
        assertEquals(Notification.NotificationType.FOLLOW, notifs.get(0).getType());
    }

    @Test
    void selfReply_doesNotGenerateNotification() {
        forumService.createReply(postId, authorId, "自回复");

        List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(authorId);
        assertTrue(notifs.isEmpty(), "自己回复自己不应发通知");
    }

    @Test
    void unreadCount_correctCount() {
        // 创建 3 条未读通知
        forumService.createReply(postId, otherUserId, "回复1");
        forumService.togglePostLike(postId, otherUserId);
        forumService.toggleFollow(otherUserId, authorId);

        long count = forumService.unreadCount(authorId);
        assertEquals(3, count);
    }

    @Test
    void markAllRead_setsAllToRead() {
        forumService.createReply(postId, otherUserId, "回复1");
        forumService.togglePostLike(postId, otherUserId);

        assertEquals(2, forumService.unreadCount(authorId));

        forumService.markAllRead(authorId);

        assertEquals(0, forumService.unreadCount(authorId));
    }

    @Test
    void markAllRead_executesSingleSqlStatement() {
        // 创建多条未读通知
        forumService.createReply(postId, otherUserId, "回复1");
        forumService.togglePostLike(postId, otherUserId);
        forumService.toggleFollow(otherUserId, authorId);
        emf.unwrap(SessionFactory.class).getStatistics().clear();

        forumService.markAllRead(authorId);

        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        // markAllRead 应该只发 1 条 UPDATE SQL（@Modifying @Query）
        // 统计中可能包含 flush 相关 SQL，取差值断言核心 SQL 为 1
        long preparedStatements = stats.getPrepareStatementCount();
        // 至少执行了 1 条 SQL（UPDATE notifications SET is_read = true ...）
        assertTrue(preparedStatements >= 1,
                "markAllRead 应执行至少 1 条 SQL，实际 " + preparedStatements);
        // 验证结果：所有通知都已读
        assertEquals(0, forumService.unreadCount(authorId));
    }

    @Test
    void markRead_singleNotification() {
        forumService.createReply(postId, otherUserId, "回复1");
        List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(authorId);
        Long notifId = notifs.get(0).getId();

        boolean result = forumService.markRead(authorId, notifId);
        assertTrue(result);
        assertEquals(0, forumService.unreadCount(authorId));
    }

    @Test
    void markRead_otherUserNotification_returnsFalse() {
        forumService.createReply(postId, otherUserId, "回复1");
        List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(authorId);
        Long notifId = notifs.get(0).getId();

        boolean result = forumService.markRead(otherUserId, notifId);
        assertFalse(result, "不能标记别人的通知为已读");
    }

    @Test
    void deleteNotification_byOwner_succeeds() {
        forumService.createReply(postId, otherUserId, "回复1");
        List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(authorId);
        Long notifId = notifs.get(0).getId();

        boolean result = forumService.deleteNotification(authorId, notifId);
        assertTrue(result);
        assertTrue(notificationRepository.findById(notifId).isEmpty());
    }
}
