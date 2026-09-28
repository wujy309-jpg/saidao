package com.training.backend.service;

import com.training.backend.entity.*;
import com.training.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 论坛服务:四大板块发帖回帖 + 点赞/收藏/关注/精华/通知 + 热门排序与搜索
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ForumService {

    private final ForumPostRepository postRepository;
    private final ForumReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final CompetitionRepository competitionRepository;
    private final PostLikeRepository postLikeRepository;
    private final ReplyLikeRepository replyLikeRepository;
    private final PostFavoriteRepository postFavoriteRepository;
    private final UserFollowRepository userFollowRepository;
    private final NotificationRepository notificationRepository;
    private final DeepSeekService deepSeekService;
    private final UserProfileRepository profileRepository;

    // ==================== 声望 ====================

    @Transactional
    public void awardReputation(Long userId, int delta) {
        if (userId == null || delta == 0) return;
        userRepository.findById(userId).ifPresent(u -> {
            u.setReputation((u.getReputation() == null ? 0 : u.getReputation()) + delta);
            userRepository.save(u);
        });
    }

    // ==================== 帖子列表 ====================

    public List<ForumPost> listPosts(ForumPost.ForumBoard board, String sort, String keyword,
                                     Long competitionId, Boolean essenceOnly, Long currentUserId,
                                     String scope) {
        List<ForumPost> all = new ArrayList<>(postRepository.findAll());

        if (board != null) {
            all.removeIf(p -> p.getBoard() != board);
        }
        if (competitionId != null) {
            all.removeIf(p -> !competitionId.equals(p.getCompetitionId()));
        }
        if (Boolean.TRUE.equals(essenceOnly)) {
            all.removeIf(p -> !Boolean.TRUE.equals(p.getEssence()));
        }
        // 校区模式:只看本校同学发的帖
        if ("school".equalsIgnoreCase(scope) && currentUserId != null) {
            String mySchool = profileRepository.findByUserId(currentUserId)
                    .map(UserProfile::getSchool)
                    .orElse(null);
            if (mySchool == null || mySchool.isBlank()) {
                return List.of();
            }
            List<Long> authorIds = all.stream()
                    .map(p -> p.getAuthor() == null ? null : p.getAuthor().getId())
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());
            Map<Long, String> schoolMap = profileRepository.findByUserIdIn(authorIds).stream()
                    .filter(p -> p.getSchool() != null && !p.getSchool().isBlank())
                    .collect(Collectors.toMap(UserProfile::getUserId, UserProfile::getSchool, (a, b) -> a));
            all.removeIf(p -> {
                if (p.getAuthor() == null) return true;
                String s = schoolMap.get(p.getAuthor().getId());
                return s == null || !s.equals(mySchool);
            });
        }
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.trim().toLowerCase();
            all.removeIf(p ->
                    !((p.getTitle() != null && p.getTitle().toLowerCase().contains(kw)) ||
                      (p.getContent() != null && p.getContent().toLowerCase().contains(kw)) ||
                      (p.getAuthor() != null && p.getAuthor().getName() != null
                              && p.getAuthor().getName().toLowerCase().contains(kw)) ||
                      (competitionNameOf(p.getCompetitionId()).toLowerCase().contains(kw)))
            );
        }

        if ("hot".equalsIgnoreCase(sort)) {
            all.sort(Comparator.comparingDouble(this::hotScore).reversed());
        } else {
            all.sort(Comparator.comparing(ForumPost::getCreatedAt,
                    Comparator.nullsLast(Comparator.reverseOrder())));
        }
        // 置顶帖始终排最前
        all.sort(Comparator.comparing(p -> Boolean.TRUE.equals(p.getPinned()) ? 0 : 1));

        markPostFlags(all, currentUserId);
        return all;
    }

    /** 热门度:互动加权 + 时间衰减(Reddit 式) */
    private double hotScore(ForumPost p) {
        double interactions = (p.getViewCount() == null ? 0 : p.getViewCount()) * 0.3
                + (p.getLikeCount() == null ? 0 : p.getLikeCount()) * 3
                + (p.getReplyCount() == null ? 0 : p.getReplyCount()) * 5
                + (Boolean.TRUE.equals(p.getEssence()) ? 30 : 0);
        LocalDateTime created = p.getCreatedAt() == null ? LocalDateTime.now() : p.getCreatedAt();
        double hours = Math.max(0, Duration.between(created, LocalDateTime.now()).toHours());
        return interactions / Math.pow(hours + 6, 1.2);
    }

    private String competitionNameOf(Long competitionId) {
        if (competitionId == null) return "";
        return competitionRepository.findById(competitionId).map(Competition::getName).orElse("");
    }

    private void markPostFlags(List<ForumPost> posts, Long userId) {
        for (ForumPost p : posts) {
            normalizePost(p);
            if (userId != null) {
                p.setLiked(postLikeRepository.existsByPostIdAndUserId(p.getId(), userId));
                p.setFavorited(postFavoriteRepository.existsByPostIdAndUserId(p.getId(), userId));
            }
        }
    }

    /** 老数据新列为 NULL 时归一化为默认值 */
    private void normalizePost(ForumPost p) {
        if (p.getViewCount() == null) p.setViewCount(0);
        if (p.getReplyCount() == null) p.setReplyCount(0);
        if (p.getLikeCount() == null) p.setLikeCount(0);
        if (p.getFavoriteCount() == null) p.setFavoriteCount(0);
        if (p.getEssence() == null) p.setEssence(false);
        if (p.getPinned() == null) p.setPinned(false);
        if (p.getAuthor() != null && p.getAuthor().getReputation() == null) {
            p.getAuthor().setReputation(0);
        }
    }

    // ==================== 发帖/详情/回帖 ====================

    @Transactional
    public ForumPost createPost(Long authorId, ForumPost.ForumBoard board, String title,
                                String content, Long teamId, Long competitionId) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        ForumPost post = new ForumPost();
        post.setAuthor(author);
        post.setBoard(board);
        post.setTitle(title);
        post.setContent(content);
        if (teamId != null) {
            post.setTeam(teamRepository.findById(teamId).orElse(null));
        }
        if (competitionId != null) {
            post.setCompetitionId(competitionId);
        }
        ForumPost saved = postRepository.save(post);
        awardReputation(authorId, 2);
        return saved;
    }

    @Transactional
    public ForumPost getPost(Long postId, Long currentUserId) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("帖子不存在"));
        post.setViewCount((post.getViewCount() == null ? 0 : post.getViewCount()) + 1);
        postRepository.save(post);
        normalizePost(post);
        if (currentUserId != null) {
            post.setLiked(postLikeRepository.existsByPostIdAndUserId(postId, currentUserId));
            post.setFavorited(postFavoriteRepository.existsByPostIdAndUserId(postId, currentUserId));
        }
        return post;
    }

    public List<ForumReply> getReplies(Long postId, Long currentUserId) {
        List<ForumReply> replies = replyRepository.findByPostIdOrderByCreatedAtAsc(postId);
        for (ForumReply r : replies) {
            if (r.getLikeCount() == null) r.setLikeCount(0);
            if (r.getAccepted() == null) r.setAccepted(false);
            if (r.getAuthor() != null && r.getAuthor().getReputation() == null) {
                r.getAuthor().setReputation(0);
            }
            if (currentUserId != null) {
                r.setLiked(replyLikeRepository.existsByReplyIdAndUserId(r.getId(), currentUserId));
            }
        }
        return replies;
    }

    @Transactional
    public ForumReply createReply(Long postId, Long authorId, String content) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("帖子不存在"));
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        ForumReply reply = new ForumReply();
        reply.setPost(post);
        reply.setAuthor(author);
        reply.setContent(content);
        ForumReply saved = replyRepository.save(reply);
        post.setReplyCount((int) replyRepository.countByPostId(postId));
        postRepository.save(post);
        awardReputation(authorId, 1);

        // 通知帖主(自己回复自己不发)
        if (!authorId.equals(post.getAuthor().getId())) {
            createNotification(post.getAuthor().getId(), Notification.NotificationType.REPLY,
                    authorId, postId, null, post.getTitle());
        }
        return saved;
    }

    // ==================== 点赞/收藏/关注 ====================

    /** @return {liked, likeCount} */
    @Transactional
    public Map<String, Object> togglePostLike(Long postId, Long userId) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("帖子不存在"));
        boolean nowLiked;
        if (postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
            postLikeRepository.deleteByPostIdAndUserId(postId, userId);
            nowLiked = false;
        } else {
            PostLike like = new PostLike();
            like.setPostId(postId);
            like.setUserId(userId);
            postLikeRepository.save(like);
            nowLiked = true;
            if (!userId.equals(post.getAuthor().getId())) {
                createNotification(post.getAuthor().getId(), Notification.NotificationType.LIKE_POST,
                        userId, postId, null, post.getTitle());
                awardReputation(post.getAuthor().getId(), 1);
            }
        }
        int count = (int) postLikeRepository.findAll().stream().filter(l -> l.getPostId().equals(postId)).count();
        post.setLikeCount(count);
        postRepository.save(post);
        return Map.of("liked", nowLiked, "likeCount", count);
    }

    /** @return {liked, likeCount} */
    @Transactional
    public Map<String, Object> toggleReplyLike(Long replyId, Long userId) {
        ForumReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new RuntimeException("回复不存在"));
        boolean nowLiked;
        if (replyLikeRepository.existsByReplyIdAndUserId(replyId, userId)) {
            replyLikeRepository.deleteByReplyIdAndUserId(replyId, userId);
            nowLiked = false;
        } else {
            ReplyLike like = new ReplyLike();
            like.setReplyId(replyId);
            like.setUserId(userId);
            replyLikeRepository.save(like);
            nowLiked = true;
            if (!userId.equals(reply.getAuthor().getId())) {
                createNotification(reply.getAuthor().getId(), Notification.NotificationType.LIKE_REPLY,
                        userId, reply.getPost().getId(), replyId,
                        reply.getPost().getTitle());
                awardReputation(reply.getAuthor().getId(), 1);
            }
        }
        int count = (int) replyLikeRepository.findAll().stream().filter(l -> l.getReplyId().equals(replyId)).count();
        reply.setLikeCount(count);
        replyRepository.save(reply);
        return Map.of("liked", nowLiked, "likeCount", count);
    }

    /** @return {favorited, favoriteCount} */
    @Transactional
    public Map<String, Object> togglePostFavorite(Long postId, Long userId) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("帖子不存在"));
        boolean nowFav;
        if (postFavoriteRepository.existsByPostIdAndUserId(postId, userId)) {
            postFavoriteRepository.deleteByPostIdAndUserId(postId, userId);
            nowFav = false;
        } else {
            PostFavorite fav = new PostFavorite();
            fav.setPostId(postId);
            fav.setUserId(userId);
            postFavoriteRepository.save(fav);
            nowFav = true;
        }
        int count = (int) postFavoriteRepository.findAll().stream().filter(f -> f.getPostId().equals(postId)).count();
        post.setFavoriteCount(count);
        postRepository.save(post);
        return Map.of("favorited", nowFav, "favoriteCount", count);
    }

    /** 我的收藏帖子 */
    public List<ForumPost> getMyFavorites(Long userId) {
        List<Long> postIds = postFavoriteRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(PostFavorite::getPostId).collect(Collectors.toList());
        if (postIds.isEmpty()) return List.of();
        List<ForumPost> posts = postRepository.findAllById(postIds);
        Map<Long, ForumPost> map = posts.stream().collect(Collectors.toMap(ForumPost::getId, p -> p));
        List<ForumPost> ordered = postIds.stream().map(map::get).filter(Objects::nonNull).collect(Collectors.toList());
        markPostFlags(ordered, userId);
        return ordered;
    }

    @Transactional
    public boolean toggleFollow(Long followerId, Long followeeId) {
        if (followerId.equals(followeeId)) {
            throw new RuntimeException("不能关注自己");
        }
        User followee = userRepository.findById(followeeId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        boolean nowFollowing;
        if (userFollowRepository.existsByFollowerIdAndFolloweeId(followerId, followeeId)) {
            userFollowRepository.deleteByFollowerIdAndFolloweeId(followerId, followeeId);
            nowFollowing = false;
        } else {
            UserFollow f = new UserFollow();
            f.setFollowerId(followerId);
            f.setFolloweeId(followeeId);
            userFollowRepository.save(f);
            nowFollowing = true;
            createNotification(followeeId, Notification.NotificationType.FOLLOW, followerId, null, null, null);
        }
        return nowFollowing;
    }

    public boolean isFollowing(Long followerId, Long followeeId) {
        return userFollowRepository.existsByFollowerIdAndFolloweeId(followerId, followeeId);
    }

    // ==================== 精华/置顶/采纳 ====================

    @Transactional
    public ForumPost toggleEssence(Long postId) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("帖子不存在"));
        boolean nowEssence = !Boolean.TRUE.equals(post.getEssence());
        post.setEssence(nowEssence);
        postRepository.save(post);
        if (nowEssence) {
            createNotification(post.getAuthor().getId(), Notification.NotificationType.ESSENCE,
                    null, postId, null, post.getTitle());
            awardReputation(post.getAuthor().getId(), 20);
        }
        return post;
    }

    @Transactional
    public ForumPost togglePinned(Long postId) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("帖子不存在"));
        post.setPinned(!Boolean.TRUE.equals(post.getPinned()));
        return postRepository.save(post);
    }

    /**
     * 采纳最佳回复:每帖仅一条,采纳+15声望并通知;再次点击取消采纳
     * @return {accepted, reply}
     */
    @Transactional
    public Map<String, Object> toggleAccept(Long replyId, Long userId, boolean isAdmin) {
        ForumReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new RuntimeException("回复不存在"));
        ForumPost post = reply.getPost();
        if (!isAdmin && !post.getAuthor().getId().equals(userId)) {
            throw new RuntimeException("只有楼主或管理员可以采纳回复");
        }
        boolean nowAccepted = !Boolean.TRUE.equals(reply.getAccepted());
        if (nowAccepted) {
            // 取消同帖其他采纳
            for (ForumReply r : replyRepository.findByPostIdOrderByCreatedAtAsc(post.getId())) {
                if (Boolean.TRUE.equals(r.getAccepted()) && !r.getId().equals(replyId)) {
                    r.setAccepted(false);
                    replyRepository.save(r);
                }
            }
            reply.setAccepted(true);
            if (!userId.equals(reply.getAuthor().getId())) {
                createNotification(reply.getAuthor().getId(), Notification.NotificationType.ACCEPTED,
                        userId, post.getId(), replyId, post.getTitle());
                awardReputation(reply.getAuthor().getId(), 15);
            }
        } else {
            reply.setAccepted(false);
        }
        replyRepository.save(reply);
        return Map.of("accepted", nowAccepted, "reply", reply);
    }

    // ==================== AI 内容助手 ====================

    private static final String POLISH_SYSTEM = "你是大学生竞赛社区的内容编辑助手。润色或扩写用户的帖子内容:保持原意与口语化风格,修正错别字与表达,补充结构,输出纯文本(不要Markdown标题),直接输出改后内容,不要解释。";

    public String aiPolish(String content, String mode) {
        String instruction = "polish".equalsIgnoreCase(mode)
                ? "请润色下面这段帖子内容(修正错别字、优化表达,不改原意):\n\n" + content
                : "请把下面这段帖子内容扩写得更完整、更有条理(补充背景、步骤与细节,控制在原文3倍以内):\n\n" + content;
        String result = deepSeekService.chat(POLISH_SYSTEM, instruction);
        return (result == null || result.isBlank()) ? content : result;
    }

    public Map<String, Object> aiSuggest(String title, String content) {
        Map<String, Object> result = new HashMap<>();
        String system = """
                你是大学生竞赛社区的分类助手。根据帖子标题与内容,判断它属于哪个板块:
                TEAM_FIND(找队友)/Q_AND_A(竞赛问答)/EXPERIENCE(经验分享)/GENERAL(综合交流)。
                并判断帖子讨论的竞赛是哪个(名称需与常见大学生竞赛全称一致,无法判断则填"无")。
                只输出 JSON:{"board":"Q_AND_A","competition":"全国大学生数学建模竞赛"}""";
        String user = "标题:" + title + "\n内容:" + content;
        String raw = deepSeekService.chat(system, user);
        String board = null;
        String compName = null;
        if (raw != null && !raw.isBlank()) {
            try {
                // 提取 JSON 片段
                int s = raw.indexOf('{');
                int e = raw.lastIndexOf('}');
                if (s >= 0 && e > s) {
                    com.fasterxml.jackson.databind.JsonNode node =
                            new com.fasterxml.jackson.databind.ObjectMapper().readTree(raw.substring(s, e + 1));
                    board = node.path("board").asText(null);
                    compName = node.path("competition").asText(null);
                }
            } catch (Exception ignored) {
            }
        }
        // 板块回退规则
        if (board == null || board.isBlank()) {
            String t = (title + content).toLowerCase();
            if (t.contains("队友") || t.contains("组队") || t.contains("招募") || t.contains("求带")) {
                board = "TEAM_FIND";
            } else if (t.contains("经验") || t.contains("复盘") || t.contains("获奖") || t.contains("踩坑")) {
                board = "EXPERIENCE";
            } else if (t.contains("怎么") || t.contains("如何") || t.contains("求问") || t.contains("?")) {
                board = "Q_AND_A";
            } else {
                board = "GENERAL";
            }
        }
        result.put("board", board);
        // 竞赛名称匹配库
        if (compName != null && !compName.isBlank() && !"无".equals(compName)) {
            String kw = compName.replaceAll("[《》\\s]", "");
            competitionRepository.findAll().stream()
                    .filter(c -> c.getName().replaceAll("[《》\\s]", "").contains(kw)
                            || (kw.length() >= 4 && c.getName().contains(kw)))
                    .findFirst()
                    .ifPresent(c -> {
                        result.put("competitionId", c.getId());
                        result.put("competitionName", c.getName());
                    });
        }
        if (!result.containsKey("competitionId")) {
            result.put("competitionId", null);
            result.put("competitionName", null);
        }
        return result;
    }

    @Transactional
    public void deletePost(Long postId, Long userId, boolean isAdmin) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("帖子不存在"));
        if (!isAdmin && !post.getAuthor().getId().equals(userId)) {
            throw new RuntimeException("只能删除自己的帖子");
        }
        // 删除回复点赞、回复、帖子点赞/收藏、帖子
        for (ForumReply r : replyRepository.findByPostIdOrderByCreatedAtAsc(postId)) {
            replyLikeRepository.deleteByReplyId(r.getId());
        }
        replyRepository.deleteByPostId(postId);
        postLikeRepository.deleteByPostId(postId);
        postFavoriteRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    @Transactional
    public void deleteReply(Long replyId, Long userId, boolean isAdmin) {
        ForumReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new RuntimeException("回复不存在"));
        if (!isAdmin && !reply.getAuthor().getId().equals(userId)) {
            throw new RuntimeException("只能删除自己的回复");
        }
        replyLikeRepository.deleteByReplyId(replyId);
        replyRepository.delete(reply);
        ForumPost post = reply.getPost();
        post.setReplyCount((int) replyRepository.countByPostId(post.getId()));
        postRepository.save(post);
    }

    // ==================== 通知 ====================

    private void createNotification(Long userId, Notification.NotificationType type,
                                    Long actorId, Long postId, Long replyId, String summary) {
        if (userId == null) return;
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setActorId(actorId);
        n.setPostId(postId);
        n.setReplyId(replyId);
        if (summary != null && summary.length() > 120) summary = summary.substring(0, 120);
        n.setSummary(summary);
        n.setRead(false);
        notificationRepository.save(n);
    }

    public List<Notification> listNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAllRead(Long userId) {
        for (Notification n : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            if (!Boolean.TRUE.equals(n.getRead())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        }
    }

    @Transactional
    public boolean markRead(Long userId, Long notificationId) {
        Notification n = notificationRepository.findById(notificationId).orElse(null);
        if (n == null || !n.getUserId().equals(userId)) return false;
        n.setRead(true);
        notificationRepository.save(n);
        return true;
    }

    @Transactional
    public boolean deleteNotification(Long userId, Long notificationId) {
        Notification n = notificationRepository.findById(notificationId).orElse(null);
        if (n == null || !n.getUserId().equals(userId)) return false;
        notificationRepository.delete(n);
        return true;
    }
}
