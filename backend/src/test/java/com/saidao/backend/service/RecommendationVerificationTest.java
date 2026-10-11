package com.saidao.backend.service;

import com.saidao.backend.dto.RecommendationItem;
import com.saidao.backend.dto.RecommendationResponse;
import com.saidao.backend.entity.Competition;
import com.saidao.backend.entity.User;
import com.saidao.backend.entity.User.UserRole;
import com.saidao.backend.entity.UserProfile;
import com.saidao.backend.repository.UserProfileRepository;
import com.saidao.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 推荐系统集成测试：验证 8 个学科的画像均能产出推荐，
 * 艺术生画像的推荐结果以艺术类竞赛为主且匹配度达标。
 */
@SpringBootTest
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Sql(scripts = "classpath:recommendation-test-data.sql")
class RecommendationVerificationTest {

    @Autowired
    private RecommendationService recommendationService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserProfileRepository profileRepository;

    private static final List<String> DISCIPLINES = List.of(
            "工科", "理科", "文科", "经管", "医学", "农学", "艺术", "其他"
    );

    private static final Set<String> ART_KEYWORDS = Set.of(
            "艺术", "音乐", "绘画", "书法", "舞蹈", "影视创作", "手工艺", "声乐", "表演", "乐器", "摄影"
    );

    // ========== 辅助方法 ==========

    private Long createUserWithProfile(String discipline, List<String> interests,
                                        List<String> skills, List<String> goals,
                                        Integer grade, Integer weeklyHours,
                                        Boolean hasExperience, String preferredLevel) {
        User user = new User();
        user.setUsername("test_" + discipline + "_" + System.nanoTime());
        user.setPassword("$2a$dummy");
        user.setName("测试_" + discipline);
        user.setRole(UserRole.STUDENT);
        userRepository.save(user);

        UserProfile profile = new UserProfile();
        profile.setUserId(user.getId());
        profile.setDiscipline(discipline);
        profile.setGrade(grade);
        profile.setInterests(interests);
        profile.setSkills(skills);
        profile.setGoals(goals);
        profile.setWeeklyHours(weeklyHours);
        profile.setHasExperience(hasExperience);
        profile.setPreferredLevel(preferredLevel);
        profileRepository.save(profile);

        return user.getId();
    }

    private Long createStandardProfile(String discipline) {
        return createUserWithProfile(discipline,
                List.of("数据分析"), List.of("Python"), List.of("能力锻炼"),
                2, 8, false, null);
    }

    private boolean isArtRelated(RecommendationItem item) {
        if (item.getCategory() == Competition.CompetitionCategory.LIBERAL_ARTS) return true;
        if (item.getTags() != null) {
            return item.getTags().stream().anyMatch(ART_KEYWORDS::contains);
        }
        return false;
    }

    // ========== 测试用例 ==========

    /**
     * 用例 1a：参数化 —— 8 个学科各构造画像，断言返回结果 ≥ 8 条
     * 每个学科独立运行，失败时可直接定位是哪个学科出问题
     */
    @ParameterizedTest(name = "学科[{0}] 推荐结果应 ≥ 8 条")
    @ValueSource(strings = {"工科", "理科", "文科", "经管", "医学", "农学", "艺术", "其他"})
    void testSingleDisciplineReturnsAtLeast8Results(String discipline) {
        Long userId = createStandardProfile(discipline);
        RecommendationResponse resp = recommendationService.generate(userId);

        assertNotNull(resp, () -> "学科[" + discipline + "] 推荐结果不应为 null");
        assertNotNull(resp.getItems(), () -> "学科[" + discipline + "] 推荐列表不应为 null");
        assertTrue(resp.getItems().size() >= 8,
                () -> "学科[" + discipline + "] 推荐结果应 ≥ 8 条，实际 " + resp.getItems().size());
    }

    /**
     * 用例 1b：批量验证 —— 8 个学科循环跑一遍（保留原测试以确保不回归）
     */
    @Test
    void testAllDisciplinesReturnAtLeast8Results() {
        for (String discipline : DISCIPLINES) {
            Long userId = createStandardProfile(discipline);
            RecommendationResponse resp = recommendationService.generate(userId);

            assertNotNull(resp, () -> "学科[" + discipline + "] 推荐结果不应为 null");
            assertNotNull(resp.getItems(), () -> "学科[" + discipline + "] 推荐列表不应为 null");
            assertTrue(resp.getItems().size() >= 8,
                    () -> "学科[" + discipline + "] 推荐结果应 ≥ 8 条，实际 " + resp.getItems().size());
        }
    }

    /**
     * 用例 2：艺术生画像 Top 8 中 ≥ 6 条为艺术类
     */
    @Test
    void testArtProfileTopRecommendationsAreArtRelated() {
        Long userId = createUserWithProfile("艺术",
                List.of("音乐", "绘画"),
                List.of("声乐", "绘画"),
                List.of("兴趣探索", "能力锻炼"),
                2, 6, false, "NATIONAL");

        RecommendationResponse resp = recommendationService.generate(userId);
        assertNotNull(resp.getItems());

        List<RecommendationItem> top8 = resp.getItems().stream().limit(8).toList();
        long artCount = top8.stream().filter(this::isArtRelated).count();

        assertTrue(artCount >= 6,
                () -> "艺术生 Top 8 中应有 ≥ 6 条艺术类，实际 " + artCount);
    }

    /**
     * 用例 3：艺术生画像最高匹配度 ≥ 75
     */
    @Test
    void testArtProfileMaxMatchScoreAbove75() {
        Long userId = createUserWithProfile("艺术",
                List.of("音乐", "绘画"),
                List.of("声乐", "绘画"),
                List.of("兴趣探索", "能力锻炼"),
                2, 6, false, "NATIONAL");

        RecommendationResponse resp = recommendationService.generate(userId);
        assertNotNull(resp.getItems());
        assertFalse(resp.getItems().isEmpty());

        int maxScore = resp.getItems().stream()
                .mapToInt(i -> i.getMatchScore() != null ? i.getMatchScore() : 0)
                .max().orElse(0);

        assertTrue(maxScore >= 75,
                () -> "艺术生最高匹配度应 ≥ 75，实际 " + maxScore);
    }
}
