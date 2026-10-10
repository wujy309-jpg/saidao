package com.saidao.backend.service;

import com.saidao.backend.dto.ForumPostDTO;
import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 性能测试：验证列表查询无 N+1 问题（SQL 条数断言）。
 * H2 内存库的绝对时间无参考价值，核心证据是 SQL 条数。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ForumPerformanceTest {

    @Autowired private ForumService forumService;
    @Autowired private UserRepository userRepository;
    @Autowired private ForumPostRepository postRepository;
    @Autowired private PostLikeRepository postLikeRepository;
    @Autowired private EntityManagerFactory emf;

    private Long testUserId;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setUsername("perfuser_" + System.nanoTime());
        user.setPassword("$2a$dummy");
        user.setName("性能测试用户");
        user.setRole(User.UserRole.STUDENT);
        userRepository.saveAndFlush(user);
        testUserId = user.getId();
    }

    @Test
    void listPosts_20Posts_sqlCountUnderThreshold() {
        // 批量插入 20 条帖子
        User author = userRepository.findById(testUserId).orElseThrow();
        List<ForumPost> posts = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            ForumPost p = new ForumPost();
            p.setAuthor(author);
            p.setBoard(ForumPost.ForumBoard.GENERAL);
            p.setTitle("性能测试帖 " + i);
            p.setContent("内容 " + i);
            posts.add(p);
        }
        postRepository.saveAllAndFlush(posts);

        // 清除统计
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();

        long start = System.currentTimeMillis();
        Page<ForumPostDTO> result = forumService.listPosts(
                null, "latest", null, null, false, testUserId, "all", 0, 20);
        long elapsed = System.currentTimeMillis() - start;

        long sqlCount = stats.getPrepareStatementCount();

        System.out.printf("listPosts 20 条: SQL count = %d, elapsed = %d ms%n", sqlCount, elapsed);

        // 20 条帖子列表查询，SQL 条数应 < 10（消除 N+1 的核心证据）
        // 可能包含：1 条分页查询 + 1 条 team 查询 + 1 条 like 查询 + 1 条 favorite 查询
        // + 1 条 competition 查询 + 1 条 profile 查询 ≈ 6 条
        assertTrue(sqlCount <= 10,
                "20 条帖子列表 SQL 条数应 ≤ 10，实际 " + sqlCount + "（可能存在 N+1）");
        assertEquals(20, result.getContent().size());
    }

    @Test
    void listPosts_50Posts_paginationWorks() {
        User author = userRepository.findById(testUserId).orElseThrow();
        List<ForumPost> posts = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            ForumPost p = new ForumPost();
            p.setAuthor(author);
            p.setBoard(ForumPost.ForumBoard.GENERAL);
            p.setTitle("分页测试帖 " + i);
            p.setContent("内容 " + i);
            posts.add(p);
        }
        postRepository.saveAllAndFlush(posts);

        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();

        long start = System.currentTimeMillis();
        Page<ForumPostDTO> page1 = forumService.listPosts(
                null, "latest", null, null, false, testUserId, "all", 0, 20);
        long elapsed = System.currentTimeMillis() - start;
        long sqlCount = stats.getPrepareStatementCount();

        System.out.printf("listPosts 分页第1页 (50条/20页): SQL count = %d, elapsed = %d ms%n",
                sqlCount, elapsed);

        assertEquals(20, page1.getContent().size());
        // DataInitializer 会创建演示帖，总数可能 > 50；断言 ≥ 50 即可
        assertTrue(page1.getTotalElements() >= 50,
                "分页总数应 ≥ 50（含测试插入 50 条 + DataInitializer 演示帖），实际 " + page1.getTotalElements());
        assertTrue(sqlCount <= 10,
                "分页查询 SQL 条数应 ≤ 10，实际 " + sqlCount);
    }

    @Test
    void getPost_singleQuery_efficientFetch() {
        User author = userRepository.findById(testUserId).orElseThrow();
        ForumPost post = new ForumPost();
        post.setAuthor(author);
        post.setBoard(ForumPost.ForumBoard.Q_AND_A);
        post.setTitle("单帖性能测试");
        post.setContent("内容");
        postRepository.saveAndFlush(post);

        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();

        long start = System.currentTimeMillis();
        ForumPost result = forumService.getPost(post.getId(), testUserId);
        long elapsed = System.currentTimeMillis() - start;
        long sqlCount = stats.getPrepareStatementCount();

        System.out.printf("getPost 单帖: SQL count = %d, elapsed = %d ms%n", sqlCount, elapsed);

        // getPost 可能包含：1 条帖子查询 + 1 条 like 查询 + 1 条 favorite 查询
        // + 1 条 follow 查询 + 1 条 team 查询 + 1 条 view 更新 ≈ 6 条
        assertTrue(sqlCount <= 10,
                "单帖查询 SQL 条数应 ≤ 10，实际 " + sqlCount);
        assertNotNull(result);
    }
}
