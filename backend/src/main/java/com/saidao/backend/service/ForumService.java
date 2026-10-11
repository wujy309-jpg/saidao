package com.saidao.backend.service;

import com.saidao.backend.dto.ForumPostDTO;
import com.saidao.backend.dto.TeamBrief;
import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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
    private final TeamQueryService teamQueryService;
    private final CompetitionRepository competitionRepository;
    private final PostLikeRepository postLikeRepository;
    private final ReplyLikeRepository replyLikeRepository;
    private final PostFavoriteRepository postFavoriteRepository;
    private final UserFollowRepository userFollowRepository;
    private final NotificationRepository notificationRepository;
    private final DeepSeekService deepSeekService;
    private final UserProfileRepository profileRepository;
    private final com.saidao.backend.repository.ForumReportRepository reportRepository;

    // ==================== 声望 ====================

    @Transactional
    public void awardReputation(Long userId, int delta) {
        if (userId == null || delta == 0) return;
        userRepository.findById(userId).ifPresent(u -> {
            int current = u.getReputation() == null ? 0 : u.getReputation();
            u.setReputation(Math.max(0, current + delta));
            userRepository.save(u);
        });
    }

    // ==================== 帖子列表 ====================

    public Page<ForumPostDTO> listPosts(ForumPost.ForumBoard board, String sort, String keyword,
                                         Long competitionId, Boolean essenceOnly, Long currentUserId,
                                         String scope, int page, int size) {
        // 构建 Specification 动态查询
        List<Specification<ForumPost>> specs = new ArrayList<>();
        // 非管理员不显示隐藏帖
        specs.add((root, query, cb) -> cb.or(
                cb.isFalse(root.get("hidden")),
                cb.isNull(root.get("hidden"))
        ));
        if (board != null) {
            specs.add((root, query, cb) -> cb.equal(root.get("board"), board));
        }
        if (competitionId != null) {
            specs.add((root, query, cb) -> cb.equal(root.get("competitionId"), competitionId));
        }
        if (Boolean.TRUE.equals(essenceOnly)) {
            specs.add((root, query, cb) -> cb.isTrue(root.get("essence")));
        }
        if (keyword != null && !keyword.isBlank()) {
            String kw = "%" + keyword.trim().toLowerCase() + "%";
            specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), kw),
                    cb.like(cb.lower(root.get("content")), kw)
            ));
        }

        // 校区模式:先查出本校作者 ID 集合
        if ("school".equalsIgnoreCase(scope) && currentUserId != null) {
            String mySchool = profileRepository.findByUserId(currentUserId)
                    .map(UserProfile::getSchool)
                    .orElse(null);
            if (mySchool == null || mySchool.isBlank()) {
                return Page.empty();
            }
            // 查本校所有用户 ID
            Set<Long> schoolUserIds = profileRepository.findBySchool(mySchool).stream()
                    .map(UserProfile::getUserId)
                    .collect(Collectors.toSet());
            if (schoolUserIds.isEmpty()) {
                return Page.empty();
            }
            specs.add((root, query, cb) -> root.get("author").get("id").in(schoolUserIds));
        }

        Specification<ForumPost> finalSpec = specs.stream().reduce(Specification.where(null), Specification::and);

        // 分页 + 排序:置顶帖优先,然后按热度或时间
        Sort.Order pinnedOrder = Sort.Order.asc("pinned").ignoreCase();
        Sort.Order contentOrder = "hot".equalsIgnoreCase(sort)
                ? Sort.Order.desc("viewCount")
                : Sort.Order.desc("createdAt");
        Pageable pageable = PageRequest.of(page, size, Sort.by(pinnedOrder, contentOrder));

        Page<ForumPost> postPage = postRepository.findAll(finalSpec, pageable);
        List<ForumPost> posts = postPage.getContent();

        // 批量填充 teamBrief
        populateTeamBriefs(posts);

        // 批量查询 liked / favorited
        Set<Long> postIds = posts.stream().map(ForumPost::getId).collect(Collectors.toSet());
        Set<Long> likedIds = currentUserId != null && !postIds.isEmpty()
                ? postLikeRepository.findAll().stream()
                    .filter(l -> l.getUserId().equals(currentUserId) && postIds.contains(l.getPostId()))
                    .map(l -> l.getPostId())
                    .collect(Collectors.toSet())
                : Set.of();
        Set<Long> favoritedIds = currentUserId != null && !postIds.isEmpty()
                ? postFavoriteRepository.findAll().stream()
                    .filter(f -> f.getUserId().equals(currentUserId) && postIds.contains(f.getPostId()))
                    .map(f -> f.getPostId())
                    .collect(Collectors.toSet())
                : Set.of();

        // 预加载 competitionName Map
        Set<Long> compIds = posts.stream()
                .map(ForumPost::getCompetitionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> compNameMap = compIds.isEmpty() ? Map.of()
                : competitionRepository.findAllById(compIds).stream()
                    .collect(Collectors.toMap(Competition::getId, Competition::getName, (a, b) -> a));

        // 预加载 author verified Map
        Set<Long> authorIds = posts.stream()
                .map(p -> p.getAuthor() == null ? null : p.getAuthor().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Boolean> verifiedMap = authorIds.isEmpty() ? Map.of()
                : profileRepository.findByUserIdIn(List.copyOf(authorIds)).stream()
                    .collect(Collectors.toMap(UserProfile::getUserId,
                            p -> Boolean.TRUE.equals(p.getVerified()), (a, b) -> a));

        // 转换为 DTO
        List<ForumPostDTO> dtos = posts.stream()
                .map(p -> ForumPostDTO.from(
                        p,
                        p.getCompetitionId() != null ? compNameMap.get(p.getCompetitionId()) : null,
                        likedIds.contains(p.getId()),
                        favoritedIds.contains(p.getId()),
                        p.getAuthor() != null ? verifiedMap.get(p.getAuthor().getId()) : null
                ))
                .collect(Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(dtos, pageable, postPage.getTotalElements());
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

    /** 批量填充 teamBrief,避免 N+1 查询 */
    private void populateTeamBriefs(List<ForumPost> posts) {
        if (posts.isEmpty()) return;
        List<Long> teamIds = posts.stream()
                .map(ForumPost::getTeamId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, TeamBrief> briefMap = teamQueryService.getBriefs(teamIds);
        for (ForumPost p : posts) {
            if (p.getTeamId() != null) {
                p.setTeamBrief(briefMap.get(p.getTeamId()));
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
            post.setTeamId(teamId);
        }
        if (competitionId != null) {
            post.setCompetitionId(competitionId);
        }
        ForumPost saved = postRepository.save(post);
        awardReputation(authorId, 2);
        populateTeamBriefs(List.of(saved));
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
            if (post.getAuthor() != null && !post.getAuthor().getId().equals(currentUserId)) {
                post.setFollowing(userFollowRepository.existsByFollowerIdAndFolloweeId(currentUserId, post.getAuthor().getId()));
            }
        }
        populateTeamBriefs(List.of(post));
        return post;
    }

    /** 关注的人的帖子 feed */
    public List<ForumPost> getFollowingFeed(Long currentUserId) {
        if (currentUserId == null) return List.of();
        List<Long> followeeIds = userFollowRepository.findByFollowerId(currentUserId).stream()
                .map(UserFollow::getFolloweeId)
                .collect(Collectors.toList());
        if (followeeIds.isEmpty()) return List.of();
        List<ForumPost> posts = postRepository.findByAuthorIdInOrderByCreatedAtDesc(followeeIds);
        markPostFlags(posts, currentUserId);
        populateTeamBriefs(posts);
        return posts;
    }

    public List<ForumReply> getReplies(Long postId, Long currentUserId) {
        List<ForumReply> replies = replyRepository.findByPostIdOrderByCreatedAtAsc(postId);
        // 过滤隐藏回复
        replies = replies.stream()
                .filter(r -> !Boolean.TRUE.equals(r.getHidden()))
                .collect(Collectors.toList());
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
            if (!userId.equals(post.getAuthor().getId())) {
                awardReputation(post.getAuthor().getId(), -1);
            }
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
        populateTeamBriefs(ordered);
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
        } else {
            awardReputation(post.getAuthor().getId(), -20);
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
            if (!userId.equals(reply.getAuthor().getId())) {
                awardReputation(reply.getAuthor().getId(), -15);
            }
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
        if (result == null || result.isBlank()) {
            // 原样返回 = 用户没拿到 AI 产出 → 本次免扣
            com.saidao.backend.billing.BillingContext.markDegraded("POLISH_LLM_EMPTY");
            return content;
        }
        return result;
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
            // AI 没给出结论、走了关键词兜底 → 本次免扣
            com.saidao.backend.billing.BillingContext.markDegraded("SUGGEST_RULE_FALLBACK");
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
        if (actorId != null) {
            n.setActorName(userRepository.findById(actorId).map(User::getName).orElse(null));
        }
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
        notificationRepository.markAllRead(userId);
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

    // ==================== 举报 ====================

    private static final int REPORT_THRESHOLD = 3;

    @Transactional
    public ForumReport submitReport(Long reporterId, Long postId, Long replyId,
                                     ForumReport.ReportReason reason, String detail) {
        if (reporterId == null) throw new RuntimeException("请先登录");
        if (postId == null && replyId == null) throw new RuntimeException("举报目标不能为空");
        if (reason == null) throw new RuntimeException("请选择举报原因");

        // 防止重复举报
        if (postId != null && reportRepository.existsByPostIdAndReporterId(postId, reporterId)) {
            throw new RuntimeException("你已举报过该帖子");
        }
        if (replyId != null && reportRepository.existsByReplyIdAndReporterId(replyId, reporterId)) {
            throw new RuntimeException("你已举报过该回复");
        }

        ForumReport report = new ForumReport();
        report.setReporterId(reporterId);
        report.setPostId(postId);
        report.setReplyId(replyId);
        report.setReason(reason);
        if (detail != null && detail.length() > 500) detail = detail.substring(0, 500);
        report.setDetail(detail);
        report.setStatus(ForumReport.ReportStatus.PENDING);
        reportRepository.save(report);

        // 阈值检查:pending 举报达阈值自动隐藏
        checkReportThreshold(postId, replyId);

        return report;
    }

    private void checkReportThreshold(Long postId, Long replyId) {
        if (postId != null) {
            long count = reportRepository.countByPostIdAndStatus(postId, ForumReport.ReportStatus.PENDING);
            if (count >= REPORT_THRESHOLD) {
                postRepository.findById(postId).ifPresent(p -> {
                    p.setHidden(true);
                    postRepository.save(p);
                });
            }
        }
        if (replyId != null) {
            long count = reportRepository.countByReplyIdAndStatus(replyId, ForumReport.ReportStatus.PENDING);
            if (count >= REPORT_THRESHOLD) {
                replyRepository.findById(replyId).ifPresent(r -> {
                    r.setHidden(true);
                    replyRepository.save(r);
                });
            }
        }
    }

    public List<ForumReport> listReports(ForumReport.ReportStatus status) {
        if (status != null) {
            return reportRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return reportRepository.findAll();
    }

    @Transactional
    public ForumReport handleReport(Long reportId, Long handlerId, ForumReport.ReportStatus decision) {
        ForumReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("举报记录不存在"));
        report.setStatus(decision);
        report.setHandlerId(handlerId);
        report.setHandledAt(java.time.LocalDateTime.now());
        reportRepository.save(report);

        // 审核通过:隐藏内容
        if (decision == ForumReport.ReportStatus.APPROVED) {
            if (report.getPostId() != null) {
                postRepository.findById(report.getPostId()).ifPresent(p -> {
                    p.setHidden(true);
                    postRepository.save(p);
                });
            }
            if (report.getReplyId() != null) {
                replyRepository.findById(report.getReplyId()).ifPresent(r -> {
                    r.setHidden(true);
                    replyRepository.save(r);
                });
            }
        }
        return report;
    }
}
