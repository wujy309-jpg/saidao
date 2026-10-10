package com.saidao.backend.util;

import com.saidao.backend.entity.*;
import com.saidao.backend.entity.User.UserRole;
import com.saidao.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 测试数据生成工具：批量构造用户/帖子/回复/点赞数据。
 * 用于性能测试、压力测试和集成测试的数据准备。
 *
 * 用法：
 * <pre>
 * {@code @Autowired TestDataGenerator generator;}
 * List<User> users = generator.createUsers(100);
 * List<ForumPost> posts = generator.createPosts(users, 500);
 * </pre>
 */
@Component
public class TestDataGenerator {

    @Autowired private UserRepository userRepository;
    @Autowired private UserProfileRepository profileRepository;
    @Autowired private ForumPostRepository postRepository;
    @Autowired private ForumReplyRepository replyRepository;
    @Autowired private PostLikeRepository postLikeRepository;

    private static final String[] DISCIPLINES = {"工科", "理科", "文科", "经管", "医学", "农学", "艺术", "其他"};
    private static final String[] BOARDS = {
            "GENERAL", "Q_AND_A", "TEAM_FIND", "EXPERIENCE"
    };
    private static final String[] INTERESTS = {
            "编程", "算法", "数学建模", "商业分析", "英语", "音乐", "绘画", "摄影"
    };
    private static final String[] SKILLS = {
            "Python", "Java", "MATLAB", "PPT", "数据分析", "Photoshop"
    };

    /**
     * 批量创建用户（含 UserProfile），每个用户角色为 STUDENT。
     *
     * @param count 用户数量
     * @return 已保存的用户列表
     */
    @Transactional
    public List<User> createUsers(int count) {
        List<User> users = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            User user = new User();
            user.setUsername("gen_user_" + System.nanoTime() + "_" + i);
            user.setPassword("$2a$dummy");
            user.setName("生成用户" + i);
            user.setRole(UserRole.STUDENT);
            user.setDepartment(DISCIPLINES[i % DISCIPLINES.length]);
            user.setEmail("gen_user_" + i + "@test.com");
            userRepository.save(user);
            users.add(user);
        }
        userRepository.flush();

        // 为每个用户创建画像
        for (int i = 0; i < users.size(); i++) {
            User user = users.get(i);
            UserProfile profile = new UserProfile();
            profile.setUserId(user.getId());
            profile.setDiscipline(DISCIPLINES[i % DISCIPLINES.length]);
            profile.setMajor("测试专业" + i);
            profile.setGrade(1 + (i % 4));
            profile.setInterests(List.of(INTERESTS[i % INTERESTS.length], INTERESTS[(i + 1) % INTERESTS.length]));
            profile.setSkills(List.of(SKILLS[i % SKILLS.length]));
            profile.setGoals(List.of("保研加分", "能力锻炼"));
            profile.setWeeklyHours(4 + (i % 10));
            profile.setHasExperience(i % 2 == 0);
            profile.setPreferredLevel(i % 2 == 0 ? "NATIONAL" : "PROVINCIAL");
            profileRepository.save(profile);
        }
        profileRepository.flush();
        return users;
    }

    /**
     * 批量创建帖子，帖子作者从 users 中轮询选取。
     *
     * @param users  作者候选池
     * @param count  帖子数量
     * @return 已保存的帖子列表
     */
    @Transactional
    public List<ForumPost> createPosts(List<User> users, int count) {
        return createPosts(users, count, 0.0);
    }

    /**
     * 批量创建帖子，可选隐藏部分帖子。
     *
     * @param users        作者候选池
     * @param count        帖子数量
     * @param hideFraction 隐藏比例（0.0 ~ 1.0），设为 0 表示不隐藏
     * @return 已保存的帖子列表
     */
    @Transactional
    public List<ForumPost> createPosts(List<User> users, int count, double hideFraction) {
        if (users == null || users.isEmpty()) {
            throw new IllegalArgumentException("用户列表不能为空");
        }
        List<ForumPost> posts = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            ForumPost post = new ForumPost();
            post.setAuthor(users.get(i % users.size()));
            post.setBoard(ForumPost.ForumBoard.valueOf(BOARDS[i % BOARDS.length]));
            post.setTitle("生成帖子标题_" + i);
            post.setContent("这是第 " + i + " 条生成帖子的正文内容，用于性能和数据量测试。");
            post.setHidden(hideFraction > 0 && i % (int) (1.0 / hideFraction) == 0);
            postRepository.save(post);
            posts.add(post);
        }
        postRepository.flush();
        return posts;
    }

    /**
     * 批量创建回复。
     *
     * @param posts  被回复的帖子候选池
     * @param users  回复作者候选池
     * @param repliesPerPost 每帖回复数
     * @return 已保存的回复列表
     */
    @Transactional
    public List<ForumReply> createReplies(List<ForumPost> posts, List<User> users, int repliesPerPost) {
        if (posts == null || posts.isEmpty() || users == null || users.isEmpty()) {
            throw new IllegalArgumentException("帖子和用户列表不能为空");
        }
        List<ForumReply> replies = new ArrayList<>();
        int userIdx = 0;
        for (ForumPost post : posts) {
            for (int j = 0; j < repliesPerPost; j++) {
                ForumReply reply = new ForumReply();
                reply.setPost(post);
                reply.setAuthor(users.get(userIdx % users.size()));
                reply.setContent("生成回复_" + j + " —— 回复帖子：" + post.getTitle());
                replyRepository.save(reply);
                replies.add(reply);
                userIdx++;
            }
        }
        replyRepository.flush();
        return replies;
    }

    /**
     * 批量创建点赞。
     *
     * @param posts      被点赞的帖子候选池
     * @param users      点赞用户候选池
     * @param likesPerPost 每帖点赞数
     * @return 已保存的点赞列表
     */
    @Transactional
    public List<PostLike> createLikes(List<ForumPost> posts, List<User> users, int likesPerPost) {
        if (posts == null || posts.isEmpty() || users == null || users.isEmpty()) {
            throw new IllegalArgumentException("帖子和用户列表不能为空");
        }
        List<PostLike> likes = new ArrayList<>();
        for (ForumPost post : posts) {
            for (int j = 0; j < likesPerPost && j < users.size(); j++) {
                User user = users.get(j);
                PostLike like = new PostLike();
                like.setPostId(post.getId());
                like.setUserId(user.getId());
                try {
                    postLikeRepository.save(like);
                    likes.add(like);
                } catch (Exception e) {
                    // 重复点赞（唯一约束）跳过
                }
            }
        }
        postLikeRepository.flush();
        return likes;
    }

    /**
     * 生成完整的测试数据集：用户 + 帖子 + 回复 + 点赞。
     *
     * @param userCount    用户数
     * @param postCount    帖子数
     * @param repliesPerPost 每帖回复数
     * @param likesPerPost   每帖点赞数
     * @return 生成统计信息
     */
    public String generateDataset(int userCount, int postCount, int repliesPerPost, int likesPerPost) {
        long start = System.currentTimeMillis();
        List<User> users = createUsers(userCount);
        List<ForumPost> posts = createPosts(users, postCount);
        List<ForumReply> replies = createReplies(posts, users, repliesPerPost);
        List<PostLike> likes = createLikes(posts, users, likesPerPost);
        long elapsed = System.currentTimeMillis() - start;

        return String.format(
                "数据集生成完成: %d 用户, %d 帖子, %d 回复, %d 点赞, 耗时 %d ms",
                users.size(), posts.size(), replies.size(), likes.size(), elapsed);
    }
}
