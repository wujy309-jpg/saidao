package com.saidao.backend.service;

import com.saidao.backend.dto.AccountDTO;
import com.saidao.backend.entity.User;
import com.saidao.backend.entity.UserProfile;
import com.saidao.backend.repository.UserProfileRepository;
import com.saidao.backend.repository.UserRepository;
import com.saidao.backend.util.AvatarPresets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * 账号自助设置：展示昵称、头像。
 *
 * <p>刻意不放在 {@code /users/**} 下——那条路径在 SecurityConfig 里是 ADMIN 专属，
 * 学生改自己的资料属于自助操作，走 {@code /account/**}（登录即可）。
 *
 * <p>登录用户名不可自助修改：它同时是登录凭据、审计日志与团队/仓库成员的外部标识，
 * 放开改名要连带处理唯一性、旧 token 与历史记录的可读性，收益远低于风险。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final AvatarService avatarService;

    /** 昵称长度（按码点计，一个汉字/emoji 记 1） */
    public static final int NAME_MIN = 2;
    public static final int NAME_MAX = 16;

    /** 昵称里不允许出现的字符：容易与系统文案、HTML 片段混淆 */
    private static final Pattern FORBIDDEN_CHARS = Pattern.compile("[<>\"'`\\\\/@#{}|\\[\\]]");

    /** 官方保留词：避免有人把昵称改成「管理员」误导其他同学 */
    private static final List<String> RESERVED_WORDS =
            List.of("管理员", "官方", "客服", "系统", "赛道团队", "admin", "administrator", "root");

    public AccountDTO view(Long userId) {
        User user = require(userId);
        UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
        return toDto(user, profile);
    }

    /** 修改展示昵称，返回规范化后的昵称 */
    @Transactional
    public String updateName(Long userId, String rawName) {
        User user = require(userId);
        String name = validateName(rawName);
        user.setName(name);
        userRepository.save(user);
        log.info("昵称已更新: userId={}, name={}", userId, name);
        return name;
    }

    /** 选用预设头像 */
    @Transactional
    public String usePresetAvatar(Long userId, String presetId) {
        User user = require(userId);
        if (!AvatarPresets.isValidId(presetId)) {
            throw new RuntimeException("预设头像不存在,请刷新页面后重试");
        }
        user.setAvatarUrl(AvatarPresets.ref(presetId));
        userRepository.save(user);
        log.info("已选用预设头像: userId={}, preset={}", userId, presetId.trim());
        return user.getAvatarUrl();
    }

    /** 上传自定义头像，返回带版本号的公开 URL */
    @Transactional
    public String uploadAvatar(Long userId, MultipartFile file) {
        User user = require(userId);
        String url = avatarService.store(userId, file);
        user.setAvatarUrl(url);
        userRepository.save(user);
        log.info("头像已更新: userId={}", userId);
        return url;
    }

    /** 恢复默认头像（同时删掉已上传的图片） */
    @Transactional
    public void resetAvatar(Long userId) {
        User user = require(userId);
        user.setAvatarUrl(null);
        userRepository.save(user);
        avatarService.delete(userId);
        log.info("头像已恢复默认: userId={}", userId);
    }

    /**
     * 昵称校验。
     *
     * <p>先做空白规范化再校验：全角空格、连续空格、换行都是「看起来像空昵称」的常见来源。
     * 校验项依次是特殊符号 → 是否含文字 → 长度 → 保留词，错误文案按用户最可能的输入原因排序。
     */
    public static String validateName(String raw) {
        if (raw == null) {
            throw new RuntimeException("昵称不能为空");
        }
        String name = raw.strip().replaceAll("\\s+", " ");
        if (name.isEmpty()) {
            throw new RuntimeException("昵称不能为空");
        }
        if (FORBIDDEN_CHARS.matcher(name).find()) {
            throw new RuntimeException("昵称不能包含 < > \" ' ` \\ / @ # 等符号");
        }
        if (name.codePoints().noneMatch(Character::isLetterOrDigit)) {
            throw new RuntimeException("昵称至少要有 1 个汉字、字母或数字");
        }
        int length = name.codePointCount(0, name.length());
        if (length < NAME_MIN || length > NAME_MAX) {
            throw new RuntimeException("昵称长度需为 " + NAME_MIN + "-" + NAME_MAX + " 个字符,当前 " + length + " 个");
        }
        String lower = name.toLowerCase(Locale.ROOT);
        for (String reserved : RESERVED_WORDS) {
            if (lower.contains(reserved.toLowerCase(Locale.ROOT))) {
                throw new RuntimeException("昵称不能包含「" + reserved + "」这类官方保留词");
            }
        }
        return name;
    }

    private User require(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
    }

    private static AccountDTO toDto(User user, UserProfile profile) {
        return new AccountDTO(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getAvatarUrl(),
                user.getRole() == null ? null : user.getRole().name(),
                user.getEmail(),
                user.getPhone(),
                user.getStudentId(),
                profile == null ? null : profile.getSchool(),
                profile == null ? null : profile.getVerified(),
                user.getReputation(),
                user.getCreatedAt()
        );
    }
}
