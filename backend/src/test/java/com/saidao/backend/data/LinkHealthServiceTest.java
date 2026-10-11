package com.saidao.backend.data;

import com.saidao.backend.entity.Competition;
import com.saidao.backend.repository.CompetitionRepository;
import com.saidao.backend.service.LinkHealthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 链接体检的记账逻辑测试。
 *
 * <p>探测本身依赖外网，不适合放进 CI；这里守的是「探测结果如何归类」——把 0（连接失败）
 * 和 4xx/5xx 都算失效、2xx/3xx 算可用、没测过的算未体检。这三类数错，后台红条就会骗人。
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:saidao_link_health;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "deepseek.enabled=false",
        "deepseek.api-key=test-fake-key-not-real"
})
class LinkHealthServiceTest {

    @Autowired
    private LinkHealthService linkHealthService;

    @Autowired
    private CompetitionRepository competitionRepository;

    private Competition firstWithUrl() {
        return competitionRepository.findAll().stream()
                .filter(c -> c.getOfficialUrl() != null && !c.getOfficialUrl().isBlank())
                .findFirst().orElseThrow();
    }

    private long brokenCount(Map<String, Object> summary) {
        return ((List<?>) summary.get("broken")).stream()
                .filter(o -> ((Map<?, ?>) o).get("name").equals(firstWithUrl().getName()))
                .count();
    }

    @Test
    @DisplayName("连接失败(0)与 4xx/5xx 都算失效，2xx/3xx 算可用，未测过算未体检")
    void classifyStatuses() {
        Competition c = firstWithUrl();

        c.setLinkStatus(null);
        c.setLinkCheckedAt(null);
        competitionRepository.save(c);
        Map<String, Object> before = linkHealthService.summary();
        long uncheckedBefore = ((Number) before.get("competitionUnchecked")).longValue();

        c.setLinkStatus(0); // 连接失败
        c.setLinkCheckedAt(LocalDateTime.now());
        competitionRepository.save(c);
        assertEquals(1, brokenCount(linkHealthService.summary()), "0 应算失效并进入清单");

        c.setLinkStatus(404);
        competitionRepository.save(c);
        assertEquals(1, brokenCount(linkHealthService.summary()), "404 应算失效");

        c.setLinkStatus(500);
        competitionRepository.save(c);
        assertEquals(1, brokenCount(linkHealthService.summary()), "500 应算失效");

        c.setLinkStatus(200);
        competitionRepository.save(c);
        Map<String, Object> ok = linkHealthService.summary();
        assertEquals(0, brokenCount(ok), "200 不应出现在失效清单里");
        assertEquals(uncheckedBefore - 1, ((Number) ok.get("competitionUnchecked")).longValue(),
                "这条测过之后，未体检数应减少 1");

        c.setLinkStatus(301);
        competitionRepository.save(c);
        assertEquals(0, brokenCount(linkHealthService.summary()), "3xx 重定向应算可用");
    }

    @Test
    @DisplayName("失效清单按状态码排序，且带得出 URL 与检测时间")
    void brokenListCarriesDetails() {
        Competition c = firstWithUrl();
        c.setLinkStatus(0);
        c.setLinkCheckedAt(LocalDateTime.now());
        competitionRepository.save(c);

        Map<String, Object> summary = linkHealthService.summary();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> broken = (List<Map<String, Object>>) summary.get("broken");
        Map<String, Object> hit = broken.stream()
                .filter(b -> b.get("name").equals(c.getName()))
                .findFirst().orElseThrow();

        assertEquals(c.getOfficialUrl(), hit.get("url"));
        assertEquals(0, hit.get("status"));
        assertNotNull(hit.get("checkedAt"));
    }

    @Test
    @DisplayName("探测异常输入不抛异常；不可达地址绝不判成「可用」")
    void probeIsFailSafe() {
        assertEquals(0, linkHealthService.probe(""), "空串应视为不可用");
        assertEquals(0, linkHealthService.probe(null), "null 应视为不可用");

        // 注意：不能断言一定等于 0——某些网络（含开发者本机的捕获式 DNS）会把不存在的域名
        // 解析到一个代理并返回 502。契约是「不可达必须被判为失效」，0 与 >=400 都满足。
        int r = linkHealthService.probe("http://saidao-does-not-exist-xyz.invalid/");
        assertTrue(r == 0 || r >= 400, "不可达地址不能判成可用，实际返回 " + r);
    }
}
