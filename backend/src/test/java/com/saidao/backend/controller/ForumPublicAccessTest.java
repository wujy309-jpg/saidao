package com.saidao.backend.controller;

import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 论坛只读接口公开访问测试：
 * 验证 SecurityConfig 中 permitAll 的 GET 接口无需认证即可访问，
 * 写接口（POST/DELETE）未认证时被拒绝。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ForumPublicAccessTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ForumPostRepository postRepository;

    private Long testPostId;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setUsername("pubuser_" + System.nanoTime());
        user.setPassword("$2a$dummy");
        user.setName("公开访问测试用户");
        user.setRole(User.UserRole.STUDENT);
        userRepository.saveAndFlush(user);

        ForumPost post = new ForumPost();
        post.setAuthor(user);
        post.setBoard(ForumPost.ForumBoard.EXPERIENCE);
        post.setTitle("公开访问测试帖");
        post.setContent("这是公开可见的帖子内容");
        postRepository.saveAndFlush(post);
        testPostId = post.getId();
    }

    // ====== GET 接口：游客可访问（permitAll）======

    @Test
    void listPosts_noAuth_returns200() throws Exception {
        mockMvc.perform(get("/api/forum/posts").contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getPostDetail_noAuth_returns200() throws Exception {
        mockMvc.perform(get("/api/forum/posts/" + testPostId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("公开访问测试帖"));
    }

    @Test
    void getReplies_noAuth_returns200() throws Exception {
        mockMvc.perform(get("/api/forum/posts/" + testPostId + "/replies").contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getBoards_noAuth_returns200() throws Exception {
        mockMvc.perform(get("/api/forum/boards").contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(4));
    }

    @Test
    void listPostsWithParams_noAuth_returns200() throws Exception {
        mockMvc.perform(get("/api/forum/posts").contextPath("/api")
                        .param("page", "0")
                        .param("size", "5")
                        .param("sort", "hot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ====== 写接口：未认证被拒绝（403 Forbidden）======

    @Test
    void createPost_noAuth_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/forum/posts").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"board\":\"Q_AND_A\",\"title\":\"test\",\"content\":\"x\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void likePost_noAuth_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/forum/posts/" + testPostId + "/like").contextPath("/api"))
                .andExpect(status().isForbidden());
    }

    @Test
    void createReply_noAuth_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/forum/posts/" + testPostId + "/replies").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"test\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void deletePost_noAuth_returnsForbidden() throws Exception {
        mockMvc.perform(delete("/api/forum/posts/" + testPostId).contextPath("/api"))
                .andExpect(status().isForbidden());
    }
}
