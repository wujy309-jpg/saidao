package com.saidao.backend.config;

import com.saidao.backend.entity.Notification;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 通知表枚举迁移的回归测试。
 *
 * <p>守的是 2026-10-08 的线上事故:旧实现不分方言地在启动时
 * {@code DROP TABLE notifications} 再用 H2 语法重建，MySQL 上重建失败且不写迁移标记，
 * 结果每次重启都删一次通知表，历史数据全部丢失。以下断言确保迁移永远不删表、不删数据。
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:saidao_notif_migration;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=update",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "deepseek.enabled=false",
        "deepseek.api-key=test-fake-key-not-real"
})
class NotificationSchemaMigrationTest {

    @Autowired
    private DataInitializer dataInitializer;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** 造一张「老结构」通知表:type 只有 VARCHAR(20)、没有 team_id，并塞入一行历史数据 */
    private void givenLegacyNotificationTable() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS notifications");
        jdbcTemplate.execute("""
                CREATE TABLE notifications (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    type VARCHAR(20) NOT NULL,
                    actor_id BIGINT,
                    post_id BIGINT,
                    reply_id BIGINT,
                    summary VARCHAR(120),
                    is_read BOOLEAN NOT NULL,
                    created_at TIMESTAMP
                )""");
        jdbcTemplate.update("INSERT INTO notifications(user_id, type, is_read, created_at) "
                + "VALUES (1, 'REPLY', FALSE, CURRENT_TIMESTAMP)");
    }

    private int notificationRows() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM notifications", Integer.class);
        return count == null ? -1 : count;
    }

    @Test
    @DisplayName("枚举迁移绝不删除通知表与已有数据")
    void migrationMustNotDropTableOrData() {
        givenLegacyNotificationTable();
        assertEquals(1, notificationRows(), "前置数据未写入");

        assertDoesNotThrow(() -> dataInitializer.migrateNotificationSchema());

        assertEquals(1, notificationRows(), "迁移把已有通知数据删掉了");
        assertEquals("REPLY", jdbcTemplate.queryForObject(
                "SELECT type FROM notifications WHERE user_id = 1", String.class));
    }

    @Test
    @DisplayName("迁移可重复执行且不报错")
    void migrationIsIdempotent() {
        givenLegacyNotificationTable();

        dataInitializer.migrateNotificationSchema();
        dataInitializer.migrateNotificationSchema();

        assertEquals(1, notificationRows());
    }

    @Test
    @DisplayName("迁移后仍可写入新增的团队事件枚举值")
    void newTeamEnumValuesRemainWritable() {
        givenLegacyNotificationTable();

        dataInitializer.migrateNotificationSchema();

        assertDoesNotThrow(() -> jdbcTemplate.update(
                "INSERT INTO notifications(user_id, type, is_read, created_at) VALUES (2, 'TEAM_APPLY', FALSE, CURRENT_TIMESTAMP)"));
        assertEquals(2, notificationRows());
    }

    @Test
    @DisplayName("MySQL ENUM 定义能解析出取值集合并据此判断缺哪些枚举")
    void parsesMysqlEnumDefinition() {
        String columnType = "enum('REPLY','LIKE_POST','LIKE_REPLY','FOLLOW','ESSENCE','ACCEPTED')";

        Set<String> existing = DataInitializer.parseEnumValues(columnType);
        assertEquals(Set.of("REPLY", "LIKE_POST", "LIKE_REPLY", "FOLLOW", "ESSENCE", "ACCEPTED"), existing);

        Set<String> required = Arrays.stream(Notification.NotificationType.values())
                .map(Enum::name)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> missing = new LinkedHashSet<>(required);
        missing.removeAll(existing);

        // 注意:协作域重构把 TEAM_TRANSFERRED 更名为 TEAM_TRANSFER（后端 TeamService 与前端标签同步改），
        // 并新增了 @提及/举报结果/积分不足/充值到账/系统 五个取值。此处按合并后的实体枚举校准。
        assertEquals(Set.of("MENTION", "REPORT_RESULT", "TEAM_APPLY", "TEAM_APPROVED", "TEAM_REJECTED",
                "TEAM_REMOVED", "TEAM_DISBANDED", "TEAM_TRANSFER", "TOKEN_LOW", "RECHARGE_PAID", "SYSTEM"), missing,
                "旧 ENUM 应被判定为缺少全部新增枚举值");

        String fullEnum = "enum(" + required.stream().map(v -> "'" + v + "'")
                .collect(Collectors.joining(",")) + ")";
        assertTrue(DataInitializer.parseEnumValues(fullEnum).containsAll(required),
                "取值已齐全时应判定为无需迁移");
    }

    @Test
    @DisplayName("字符串列长度解析（用于判断是否容纳得下枚举值）")
    void parsesCharLength() {
        assertEquals(20, DataInitializer.parseCharLength("varchar(20)"));
        assertEquals(40, DataInitializer.parseCharLength("VARCHAR(40)"));
        assertEquals(10, DataInitializer.parseCharLength("char(10)"));
        assertNull(DataInitializer.parseCharLength("enum('A','B')"));
        assertNull(DataInitializer.parseCharLength("bigint"));

        // 迁移按「最长枚举名」判断 VARCHAR 列是否容纳得下；守住它放得进实体的 VARCHAR(40)
        int longestEnumName = Arrays.stream(Notification.NotificationType.values())
                .mapToInt(v -> v.name().length()).max().orElse(0);
        assertTrue(longestEnumName <= 40,
                "最长枚举名(" + longestEnumName + " 字符)需能放进 notifications.type VARCHAR(40)");
    }
}
