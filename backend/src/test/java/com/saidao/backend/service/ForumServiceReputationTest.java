package com.saidao.backend.service;

import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * ForumService 声望系统纯单元测试（Mockito，无 DB）
 * 覆盖：awardReputation 正/负/边界值、togglePostLike/toggleEssence/toggleAccept 取消分支声望扣减
 */
@ExtendWith(MockitoExtension.class)
class ForumServiceReputationTest {

    @Mock private ForumPostRepository postRepository;
    @Mock private ForumReplyRepository replyRepository;
    @Mock private UserRepository userRepository;
    @Mock private TeamQueryService teamQueryService;
    @Mock private CompetitionRepository competitionRepository;
    @Mock private PostLikeRepository postLikeRepository;
    @Mock private ReplyLikeRepository replyLikeRepository;
    @Mock private PostFavoriteRepository postFavoriteRepository;
    @Mock private UserFollowRepository userFollowRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private DeepSeekService deepSeekService;
    @Mock private UserProfileRepository profileRepository;
    @Mock private ForumReportRepository reportRepository;

    @InjectMocks
    private ForumService forumService;

    // ==================== awardReputation 直接测试 ====================

    @Test
    void awardReputation_positiveDelta_increasesReputation() {
        User user = new User();
        user.setId(1L);
        user.setReputation(10);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        forumService.awardReputation(1L, 5);

        assertEquals(15, user.getReputation());
        verify(userRepository).save(user);
    }

    @Test
    void awardReputation_negativeDelta_decreasesReputation() {
        User user = new User();
        user.setId(1L);
        user.setReputation(10);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        forumService.awardReputation(1L, -3);

        assertEquals(7, user.getReputation());
        verify(userRepository).save(user);
    }

    @Test
    void awardReputation_negativeDeltaFloorsAtZero() {
        User user = new User();
        user.setId(1L);
        user.setReputation(5);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        forumService.awardReputation(1L, -100);

        assertEquals(0, user.getReputation(), "声望不应降到负数");
        verify(userRepository).save(user);
    }

    @Test
    void awardReputation_nullUserId_noOp() {
        forumService.awardReputation(null, 5);

        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void awardReputation_zeroDelta_noOp() {
        forumService.awardReputation(1L, 0);

        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void awardReputation_userNotFound_noOp() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        forumService.awardReputation(999L, 5);

        verify(userRepository, never()).save(any());
    }

    @Test
    void awardReputation_nullReputation_treatedAsZero() {
        User user = new User();
        user.setId(1L);
        user.setReputation(null);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        forumService.awardReputation(1L, 5);

        assertEquals(5, user.getReputation(), "null 声望应视为 0");
        verify(userRepository).save(user);
    }

    // ==================== togglePostLike 取消点赞声望扣减 ====================

    @Test
    void togglePostLike_unlike_decreasesAuthorReputation() {
        User author = new User();
        author.setId(2L);
        author.setReputation(10);

        User liker = new User();
        liker.setId(1L);

        ForumPost post = new ForumPost();
        post.setId(100L);
        post.setAuthor(author);
        post.setLikeCount(1);

        when(postRepository.findById(100L)).thenReturn(Optional.of(post));
        when(postLikeRepository.existsByPostIdAndUserId(100L, 1L)).thenReturn(true);
        when(userRepository.findById(2L)).thenReturn(Optional.of(author));
        when(postLikeRepository.findAll()).thenReturn(java.util.List.of());

        forumService.togglePostLike(100L, 1L);

        assertEquals(9, author.getReputation(), "取消点赞应扣减 1 声望");
        verify(userRepository).save(author);
    }

    @Test
    void togglePostLike_unlike_selfLike_noReputationChange() {
        User author = new User();
        author.setId(1L);
        author.setReputation(10);

        ForumPost post = new ForumPost();
        post.setId(100L);
        post.setAuthor(author);
        post.setLikeCount(1);

        when(postRepository.findById(100L)).thenReturn(Optional.of(post));
        when(postLikeRepository.existsByPostIdAndUserId(100L, 1L)).thenReturn(true);
        when(postLikeRepository.findAll()).thenReturn(java.util.List.of());

        forumService.togglePostLike(100L, 1L);

        assertEquals(10, author.getReputation(), "自赞取消不应扣减声望");
        verify(userRepository, never()).save(any());
    }

    // ==================== toggleEssence 取消精华声望扣减 ====================

    @Test
    void toggleEssence_cancel_decreasesReputation() {
        User author = new User();
        author.setId(1L);
        author.setReputation(50);

        ForumPost post = new ForumPost();
        post.setId(100L);
        post.setAuthor(author);
        post.setEssence(true);

        when(postRepository.findById(100L)).thenReturn(Optional.of(post));
        when(userRepository.findById(1L)).thenReturn(Optional.of(author));

        forumService.toggleEssence(100L);

        assertEquals(30, author.getReputation(), "取消精华应扣减 20 声望");
        verify(userRepository).save(author);
    }

    @Test
    void toggleEssence_grant_increasesReputation() {
        User author = new User();
        author.setId(1L);
        author.setReputation(10);

        ForumPost post = new ForumPost();
        post.setId(100L);
        post.setAuthor(author);
        post.setEssence(false);

        when(postRepository.findById(100L)).thenReturn(Optional.of(post));
        when(userRepository.findById(1L)).thenReturn(Optional.of(author));

        forumService.toggleEssence(100L);

        assertEquals(30, author.getReputation(), "加精华应增加 20 声望");
        verify(userRepository).save(author);
    }

    // ==================== toggleAccept 取消采纳声望扣减 ====================

    @Test
    void toggleAccept_cancel_decreasesReplyAuthorReputation() {
        User replyAuthor = new User();
        replyAuthor.setId(3L);
        replyAuthor.setReputation(30);

        User postAuthor = new User();
        postAuthor.setId(1L);

        ForumPost post = new ForumPost();
        post.setId(100L);
        post.setAuthor(postAuthor);

        ForumReply reply = new ForumReply();
        reply.setId(200L);
        reply.setPost(post);
        reply.setAuthor(replyAuthor);
        reply.setAccepted(true);

        when(replyRepository.findById(200L)).thenReturn(Optional.of(reply));
        when(userRepository.findById(3L)).thenReturn(Optional.of(replyAuthor));

        forumService.toggleAccept(200L, 1L, true);

        assertEquals(15, replyAuthor.getReputation(), "取消采纳应扣减 15 声望");
        verify(userRepository).save(replyAuthor);
    }

    @Test
    void toggleAccept_cancel_selfAccept_noReputationChange() {
        User author = new User();
        author.setId(1L);
        author.setReputation(30);

        ForumPost post = new ForumPost();
        post.setId(100L);
        post.setAuthor(author);

        ForumReply reply = new ForumReply();
        reply.setId(200L);
        reply.setPost(post);
        reply.setAuthor(author);
        reply.setAccepted(true);

        when(replyRepository.findById(200L)).thenReturn(Optional.of(reply));

        forumService.toggleAccept(200L, 1L, true);

        assertEquals(30, author.getReputation(), "自采取消不应扣减声望");
        verify(userRepository, never()).save(any());
    }
}
