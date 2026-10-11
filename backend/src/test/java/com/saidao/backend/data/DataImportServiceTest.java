package com.saidao.backend.data;

import com.saidao.backend.entity.Competition;
import com.saidao.backend.repository.CompetitionRepository;
import com.saidao.backend.repository.ExcellentWorkRepository;
import com.saidao.backend.service.DataImportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 批量导入的护栏测试。
 *
 * <p>这类工具最危险的失败方式不是报错，而是「静默改坏数据」：把没写的字段清空、
 * 或者按名称匹配不上却当作成功。下面每条断言都在守这两点。
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:saidao_data_import;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "deepseek.enabled=false",
        "deepseek.api-key=test-fake-key-not-real"
})
class DataImportServiceTest {

    @Autowired
    private DataImportService dataImportService;

    @Autowired
    private CompetitionRepository competitionRepository;

    @Autowired
    private ExcellentWorkRepository excellentWorkRepository;

    private static final String SEED_NAME = "全国大学生电子设计竞赛"; // 种子数据里必定存在

    private Competition seed() {
        return competitionRepository.findByNameContainingIgnoreCase(SEED_NAME).stream()
                .filter(c -> c.getName().equals(SEED_NAME))
                .findFirst().orElseThrow();
    }

    @Test
    @DisplayName("dry-run 只预览不落库")
    void dryRunDoesNotWrite() {
        long before = competitionRepository.count();
        String rules = "【dry-run 测试】不该被写进去";

        Map<String, Object> report = dataImportService.importCompetitions(
                List.of(Map.of("name", SEED_NAME, "rules", rules)), true);

        assertEquals(1, report.get("updated"), "应识别为 1 条更新：" + report);
        assertEquals(before, competitionRepository.count(), "dry-run 不得改变数据量");
        assertNotEquals(rules, seed().getRules(), "dry-run 不得写入内容");
    }

    @Test
    @DisplayName("只覆盖显式给出的字段，未给出的保持原值")
    void onlyExplicitFieldsAreOverwritten() {
        Competition before = seed();
        String oldUrl = before.getOfficialUrl();
        String oldCategory = String.valueOf(before.getCategory());
        String newRules = "【导入测试】只改规则的场景";

        dataImportService.importCompetitions(
                List.of(Map.of("name", SEED_NAME, "rules", newRules)), false);

        Competition after = seed();
        assertEquals(newRules, after.getRules(), "显式给出的 rules 应更新");
        assertEquals(oldUrl, after.getOfficialUrl(), "没给的 officialUrl 不能被清空");
        assertEquals(oldCategory, String.valueOf(after.getCategory()), "没给的 category 不能被改动");
    }

    @Test
    @DisplayName("枚举非法时归入 invalid，不写库")
    void invalidEnumIsReported() {
        String oldCategory = String.valueOf(seed().getCategory());

        Map<String, Object> report = dataImportService.importCompetitions(
                List.of(Map.of("name", SEED_NAME, "category", "NOT_A_CATEGORY")), false);

        assertEquals(1, report.get("invalidCount"), "非法枚举应被拒绝：" + report);
        assertTrue(report.get("invalid").toString().contains(SEED_NAME) || !((List<?>) report.get("invalid")).isEmpty());
        assertEquals(oldCategory, String.valueOf(seed().getCategory()), "被拒绝的条目不得改动数据");
    }

    @Test
    @DisplayName("新建竞赛：名称不存在时新增，并保持必填校验")
    void createsNewCompetition() {
        String name = "【导入测试】虚构竞赛 A";
        competitionRepository.findByNameContainingIgnoreCase(name)
                .forEach(c -> competitionRepository.delete(c));

        Map<String, Object> report = dataImportService.importCompetitions(List.of(Map.of(
                "name", name,
                "category", "ENGINEERING",
                "level", "NATIONAL",
                "format", "TEAM",
                "difficulty", 3,
                "prestige", 3,
                "officialUrl", "https://example.com/"
        )), false);

        assertEquals(1, report.get("created"), "应新增 1 条：" + report);
        assertTrue(competitionRepository.findByNameContainingIgnoreCase(name).stream()
                .anyMatch(c -> c.getName().equals(name)));

        // 缺必填枚举 → invalid
        Map<String, Object> bad = dataImportService.importCompetitions(
                List.of(Map.of("name", "【导入测试】虚构竞赛 B", "level", "NATIONAL")), true);
        assertEquals(1, bad.get("invalidCount"), "缺 category/format 应被拒绝");
    }

    @Test
    @DisplayName("优秀作品：绑不上竞赛的条目必须报错，而不是静默丢弃")
    void worksMustBindToExistingCompetition() {
        long before = excellentWorkRepository.count();

        Map<String, Object> report = dataImportService.importWorks(List.of(Map.of(
                "competitionName", "这个竞赛不存在",
                "title", "某作品",
                "link", "https://example.com/work"
        )), false);

        assertEquals(1, report.get("invalidCount"), "绑不上竞赛应报 invalid：" + report);
        assertTrue(report.get("invalid").toString().contains("找不到同名竞赛"));
        assertEquals(before, excellentWorkRepository.count(), "不得写入任何作品");
    }

    @Test
    @DisplayName("优秀作品：正常新增并按竞赛名绑定到正确 competitionId")
    void worksBindToCorrectCompetition() {
        Long compId = seed().getId();
        String title = "【导入测试】历年赛题汇总";

        Map<String, Object> report = dataImportService.importWorks(List.of(Map.of(
                "competitionName", SEED_NAME,
                "title", title,
                "description", "测试用条目",
                "year", 2025,
                "award", "官方赛题",
                "team", "全国组委会",
                "type", "PROJECT",
                "link", "https://example.com/works"
        )), false);

        assertTrue((int) report.get("created") >= 1, "应新增作品：" + report);
        assertTrue(excellentWorkRepository.findByCompetitionIdOrderBySortOrderAscYearDesc(compId).stream()
                .anyMatch(w -> w.getTitle().equals(title) && compId.equals(w.getCompetitionId())));
    }

    @Test
    @DisplayName("超量导入被拒绝")
    void rejectsTooManyItems() {
        List<Map<String, Object>> huge = java.util.stream.IntStream.range(0, 501)
                .mapToObj(i -> Map.<String, Object>of("name", "批量" + i))
                .toList();
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> dataImportService.importCompetitions(huge, true));
        assertTrue(ex.getMessage().contains("最多"));
    }
}
