package com.saidao.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saidao.backend.entity.User;
import com.saidao.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 账号自助设置（头像 / 昵称）集成测试。
 *
 * <p>覆盖三件容易在联调时才炸的事：
 * <ol>
 *   <li>{@code /account/**} 必须登录才能写（不能落到 {@code /users/**} 的 ADMIN 规则上）；</li>
 *   <li>头像图片本身是公开只读资源——&lt;img&gt; 不带 token，带头访问会得到 403 + 破图；</li>
 *   <li>普通学生也能打开别人的主页（历史 bug：{@code /users/{id}/profile} 被 ADMIN 规则误拦）。</li>
 * </ol>
 */
@SpringBootTest(properties = "file.upload-dir=./target/test-uploads")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AccountControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper om;
    @Autowired private UserRepository userRepository;

    private Long userId;
    private Long otherUserId;
    private Authentication auth;

    @BeforeEach
    void setUp() {
        userId = saveUser("avatar_owner_" + System.nanoTime(), "原始昵称");
        otherUserId = saveUser("avatar_other_" + System.nanoTime(), "路人甲");
        auth = new UsernamePasswordAuthenticationToken(
                userId, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    private Long saveUser(String username, String name) {
        User user = new User();
        user.setUsername(username);
        user.setPassword("$2a$dummy");
        user.setName(name);
        user.setRole(User.UserRole.STUDENT);
        user.setReputation(0);
        return userRepository.saveAndFlush(user).getId();
    }

    private MockMultipartFile pngFile() throws Exception {
        BufferedImage image = new BufferedImage(600, 300, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.decode("#0ea5e9"));
        g.fillRect(0, 0, 600, 300);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return new MockMultipartFile("file", "avatar.png", "image/png", out.toByteArray());
    }

    @Test
    @DisplayName("未登录不能读写账号设置")
    void requiresLogin() throws Exception {
        mockMvc.perform(get("/api/account/me").contextPath("/api"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/account/name").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("name", "路人"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /account/me 返回本人账号视图")
    void returnsOwnAccount() throws Exception {
        mockMvc.perform(get("/api/account/me").contextPath("/api").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(userId))
                .andExpect(jsonPath("$.data.name").value("原始昵称"))
                .andExpect(jsonPath("$.data.role").value("STUDENT"));
    }

    @Test
    @DisplayName("改昵称立即生效,并回带最新账号视图")
    void updatesName() throws Exception {
        mockMvc.perform(put("/api/account/name").contextPath("/api")
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("name", "  竞赛小王子 "))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("竞赛小王子"));

        assertThat(userRepository.findById(userId).orElseThrow().getName()).isEqualTo("竞赛小王子");
    }

    @Test
    @DisplayName("非法昵称被拒且不改库")
    void rejectsInvalidName() throws Exception {
        mockMvc.perform(put("/api/account/name").contextPath("/api")
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("name", "管理员"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("官方保留词")));

        assertThat(userRepository.findById(userId).orElseThrow().getName()).isEqualTo("原始昵称");
    }

    @Test
    @DisplayName("预设头像:白名单内的 ID 生效,未知 ID 被拒")
    void appliesPresetAvatar() throws Exception {
        mockMvc.perform(put("/api/account/avatar/preset").contextPath("/api")
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("presetId", "rocket"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value("preset:rocket"));

        mockMvc.perform(put("/api/account/avatar/preset").contextPath("/api")
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("presetId", "hacker"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("上传头像后,图片可以不带 token 被 <img> 读到")
    void uploadsAvatarAndServesItPublicly() throws Exception {
        String body = mockMvc.perform(multipart("/api/account/avatar").file(pngFile()).contextPath("/api")
                        .with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value(org.hamcrest.Matchers.startsWith(
                        "/api/avatars/" + userId + "?v=")))
                .andReturn().getResponse().getContentAsString();

        String url = om.readTree(body).path("data").path("avatarUrl").asText();
        String path = url.substring(0, url.indexOf('?'));

        mockMvc.perform(get(path).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", MediaType.IMAGE_PNG_VALUE))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age")));
    }

    @Test
    @DisplayName("恢复默认头像后清空引用,图片地址随之 404")
    void resetsAvatar() throws Exception {
        mockMvc.perform(multipart("/api/account/avatar").file(pngFile()).contextPath("/api").with(authentication(auth)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/account/avatar").contextPath("/api").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").doesNotExist());

        assertThat(userRepository.findById(userId).orElseThrow().getAvatarUrl()).isNull();

        mockMvc.perform(get("/api/avatars/" + userId).contextPath("/api"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("伪装成图片的文件被拒")
    void rejectsFakeImage() throws Exception {
        MockMultipartFile fake = new MockMultipartFile(
                "file", "avatar.png", "image/png", "not an image".getBytes());

        mockMvc.perform(multipart("/api/account/avatar").file(fake).contextPath("/api").with(authentication(auth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("普通学生也能打开他人主页(不再被 /users/** 的 ADMIN 规则拦成 403)")
    void studentCanViewOtherProfile() throws Exception {
        mockMvc.perform(get("/api/users/" + otherUserId + "/profile").contextPath("/api")
                        .with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("路人甲"))
                .andExpect(jsonPath("$.data.avatarUrl").doesNotExist());
    }
}
