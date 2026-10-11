package com.saidao.backend.controller;

import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 论坛 Controller 集成测试：发帖/详情/回帖/点赞/收藏完整流程
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ForumControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper om;
    @Autowired private UserRepository userRepository;
    @Autowired private ForumPostRepository postRepository;
    @Autowired private ForumReplyRepository replyRepository;

    private Long testUserId;
    private Authentication testAuth;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setUsername("testuser_" + System.nanoTime());
        user.setPassword("$2a$dummy");
        user.setName("测试用户");
        user.setRole(User.UserRole.STUDENT);
        user.setReputation(10);
        userRepository.saveAndFlush(user);
        testUserId = user.getId();

        testAuth = new UsernamePasswordAuthenticationToken(
                testUserId, null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void createPost_authenticated_returnsSuccess() throws Exception {
        Map<String, Object> body = Map.of(
                "board", "Q_AND_A",
                "title", "集成测试帖子",
                "content", "这是一个测试内容"
        );
        mockMvc.perform(post("/api/forum/posts").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(body))
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("集成测试帖子"))
                .andExpect(jsonPath("$.data.author.id").value(testUserId));
    }

    @Test
    void createPost_unauthenticated_returnsForbidden() throws Exception {
        Map<String, Object> body = Map.of(
                "board", "Q_AND_A",
                "title", "未登录帖子",
                "content", "内容"
        );
        mockMvc.perform(post("/api/forum/posts").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getPostDetail_afterCreate_returnsContent() throws Exception {
        ForumPost post = new ForumPost();
        post.setAuthor(userRepository.findById(testUserId).orElseThrow());
        post.setBoard(ForumPost.ForumBoard.EXPERIENCE);
        post.setTitle("详情测试帖");
        post.setContent("详情内容");
        postRepository.saveAndFlush(post);

        mockMvc.perform(get("/api/forum/posts/" + post.getId()).contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("详情测试帖"))
                .andExpect(jsonPath("$.data.content").exists());
    }

    @Test
    void listPosts_returnsPageWithDtos() throws Exception {
        ForumPost post = new ForumPost();
        post.setAuthor(userRepository.findById(testUserId).orElseThrow());
        post.setBoard(ForumPost.ForumBoard.GENERAL);
        post.setTitle("列表测试帖");
        post.setContent("列表内容");
        postRepository.saveAndFlush(post);

        mockMvc.perform(get("/api/forum/posts").contextPath("/api")
                        .param("page", "0")
                        .param("size", "10")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content[0].title").value("列表测试帖"));
    }

    @Test
    void createReply_authenticated_returnsSuccess() throws Exception {
        ForumPost post = new ForumPost();
        post.setAuthor(userRepository.findById(testUserId).orElseThrow());
        post.setBoard(ForumPost.ForumBoard.Q_AND_A);
        post.setTitle("回帖测试帖");
        post.setContent("内容");
        postRepository.saveAndFlush(post);

        Map<String, String> body = Map.of("content", "这是一条回复");
        mockMvc.perform(post("/api/forum/posts/" + post.getId() + "/replies").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(body))
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").value("这是一条回复"))
                .andExpect(jsonPath("$.data.author.id").value(testUserId));
    }

    @Test
    void togglePostLike_createsAndRemoves() throws Exception {
        ForumPost post = new ForumPost();
        post.setAuthor(userRepository.findById(testUserId).orElseThrow());
        post.setBoard(ForumPost.ForumBoard.GENERAL);
        post.setTitle("点赞测试帖");
        post.setContent("内容");
        postRepository.saveAndFlush(post);

        // 点赞
        mockMvc.perform(post("/api/forum/posts/" + post.getId() + "/like").contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.liked").value(true))
                .andExpect(jsonPath("$.data.likeCount").value(1));

        // 取消点赞
        mockMvc.perform(post("/api/forum/posts/" + post.getId() + "/like").contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.liked").value(false))
                .andExpect(jsonPath("$.data.likeCount").value(0));
    }

    @Test
    void togglePostFavorite_createsAndRemoves() throws Exception {
        ForumPost post = new ForumPost();
        post.setAuthor(userRepository.findById(testUserId).orElseThrow());
        post.setBoard(ForumPost.ForumBoard.GENERAL);
        post.setTitle("收藏测试帖");
        post.setContent("内容");
        postRepository.saveAndFlush(post);

        mockMvc.perform(post("/api/forum/posts/" + post.getId() + "/favorite").contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.favorited").value(true));

        mockMvc.perform(post("/api/forum/posts/" + post.getId() + "/favorite").contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.favorited").value(false));
    }

    @Test
    void getBoards_returnsFourBoards() throws Exception {
        mockMvc.perform(get("/api/forum/boards").contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(4))
                .andExpect(jsonPath("$.data[0].code").value("TEAM_FIND"));
    }

    @Test
    void getReplies_returnsList() throws Exception {
        ForumPost post = new ForumPost();
        post.setAuthor(userRepository.findById(testUserId).orElseThrow());
        post.setBoard(ForumPost.ForumBoard.Q_AND_A);
        post.setTitle("回复列表测试帖");
        post.setContent("内容");
        postRepository.saveAndFlush(post);

        ForumReply reply = new ForumReply();
        reply.setPost(post);
        reply.setAuthor(userRepository.findById(testUserId).orElseThrow());
        reply.setContent("测试回复");
        replyRepository.saveAndFlush(reply);

        mockMvc.perform(get("/api/forum/posts/" + post.getId() + "/replies").contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].content").value("测试回复"));
    }

    @Test
    void deletePost_byAuthor_succeeds() throws Exception {
        ForumPost post = new ForumPost();
        post.setAuthor(userRepository.findById(testUserId).orElseThrow());
        post.setBoard(ForumPost.ForumBoard.GENERAL);
        post.setTitle("删除测试帖");
        post.setContent("内容");
        postRepository.saveAndFlush(post);

        mockMvc.perform(delete("/api/forum/posts/" + post.getId()).contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void deletePost_byNonAuthor_returnsError() throws Exception {
        User other = new User();
        other.setUsername("other_" + System.nanoTime());
        other.setPassword("$2a$dummy");
        other.setName("其他用户");
        other.setRole(User.UserRole.STUDENT);
        userRepository.saveAndFlush(other);

        ForumPost post = new ForumPost();
        post.setAuthor(other);
        post.setBoard(ForumPost.ForumBoard.GENERAL);
        post.setTitle("别人的帖");
        post.setContent("内容");
        postRepository.saveAndFlush(post);

        mockMvc.perform(delete("/api/forum/posts/" + post.getId()).contextPath("/api")
                        .with(authentication(testAuth)))
                .andExpect(status().is4xxClientError());
    }
}
