package com.saidao.backend.util;

import java.util.List;
import java.util.Set;

/**
 * 预设头像目录（服务端只认 ID，视觉由前端渲染）。
 *
 * <p>落库格式约定：{@code users.avatar_url} 三种取值——
 * <ul>
 *   <li>{@code null}：默认头像（前端按昵称首字生成确定性色块）</li>
 *   <li>{@code preset:<id>}：系统预设头像，ID 取自本类白名单</li>
 *   <li>{@code /api/avatars/{userId}?v=...}：用户上传的图片</li>
 * </ul>
 *
 * <p>新增预设时必须同步修改 {@code frontend/src/lib/avatars.ts}；两边 ID 一致即可。
 * 前端对无法识别的 ID 会退化成首字色块，所以漏改不会白屏，只会「看起来没生效」。
 */
public final class AvatarPresets {

    /** 预设头像的落库前缀 */
    public static final String PREFIX = "preset:";

    /** 全部合法预设 ID（顺序即前端展示顺序） */
    public static final List<String> IDS = List.of(
            "rocket",   // 探索突破
            "book",     // 学术积累
            "bulb",     // 创意灵感
            "trophy",   // 竞赛荣誉
            "code",     // 工程实现
            "palette",  // 设计表达
            "flask",    // 科研实验
            "compass",  // 方向规划
            "leaf",     // 稳步成长
            "star"      // 目标达成
    );

    private static final Set<String> ID_SET = Set.copyOf(IDS);

    private AvatarPresets() {
    }

    /** 是否为合法预设 ID */
    public static boolean isValidId(String id) {
        return id != null && ID_SET.contains(id.trim());
    }

    /** 生成落库引用 */
    public static String ref(String id) {
        return PREFIX + id.trim();
    }

    /** 是否为预设头像引用 */
    public static boolean isPresetRef(String avatarUrl) {
        return avatarUrl != null && avatarUrl.startsWith(PREFIX);
    }

    /** 从预设引用中取出 ID，非预设引用返回 null */
    public static String idOf(String avatarUrl) {
        return isPresetRef(avatarUrl) ? avatarUrl.substring(PREFIX.length()) : null;
    }
}
