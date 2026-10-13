package com.saidao.backend.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 昵称校验规则单测。
 *
 * <p>规则本身是纯函数，所以这里把边界一次性铺开：前端 {@code lib/nickname.ts} 是与它镜像的一份，
 * 两边的文案与阈值要保持一致，否则会出现「前端说能存、后端说不行」的错位。
 */
class AccountNameValidationTest {

    @Test
    @DisplayName("去掉首尾空白并把连续空白压成一个空格")
    void normalizesWhitespace() {
        assertEquals("爱 打比赛", AccountService.validateName("  爱   打比赛  "));
        assertEquals("Alice 2026", AccountService.validateName("Alice\t\n2026"));
    }

    @Test
    @DisplayName("正常昵称通过")
    void acceptsReasonableNames() {
        assertEquals("竞赛小王子", AccountService.validateName("竞赛小王子"));
        assertEquals("Alice_2026", AccountService.validateName("Alice_2026"));
        assertEquals("张三-电科", AccountService.validateName("张三-电科"));
    }

    @Test
    @DisplayName("空昵称被拒绝")
    void rejectsBlank() {
        assertTrue(assertThrows(RuntimeException.class, () -> AccountService.validateName(null))
                .getMessage().contains("不能为空"));
        assertTrue(assertThrows(RuntimeException.class, () -> AccountService.validateName("   "))
                .getMessage().contains("不能为空"));
    }

    @Test
    @DisplayName("长度按码点计,2-16 个字符")
    void enforcesLength() {
        assertTrue(assertThrows(RuntimeException.class, () -> AccountService.validateName("王"))
                .getMessage().contains("2-16"));
        assertEquals("一".repeat(16), AccountService.validateName("一".repeat(16)));
        assertTrue(assertThrows(RuntimeException.class, () -> AccountService.validateName("一".repeat(17)))
                .getMessage().contains("2-16"));
        // 代理对(emoji)只算 1 个字符,不能因为 UTF-16 长度把正常昵称判超长
        assertEquals("🚀".repeat(15) + "a", AccountService.validateName("🚀".repeat(15) + "a"));
    }

    @Test
    @DisplayName("特殊符号与纯符号昵称被拒绝")
    void rejectsIllegalChars() {
        assertTrue(assertThrows(RuntimeException.class, () -> AccountService.validateName("<script>"))
                .getMessage().contains("符号"));
        assertTrue(assertThrows(RuntimeException.class, () -> AccountService.validateName("a@b"))
                .getMessage().contains("符号"));
        assertTrue(assertThrows(RuntimeException.class, () -> AccountService.validateName("---"))
                .getMessage().contains("汉字"));
    }

    @Test
    @DisplayName("官方保留词被拒绝,避免冒充管理员")
    void rejectsReservedWords() {
        for (String name : new String[]{"管理员", "官方客服小助手", "系统通知", "Admin01", "root用户"}) {
            RuntimeException error = assertThrows(RuntimeException.class,
                    () -> AccountService.validateName(name), name + " 应被拒绝");
            assertTrue(error.getMessage().contains("官方保留词"), error.getMessage());
        }
    }
}
