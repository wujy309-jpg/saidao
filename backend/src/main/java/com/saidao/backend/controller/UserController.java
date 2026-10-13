package com.saidao.backend.controller;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.dto.PageResponse;
import com.saidao.backend.dto.UserProfileDTO;
import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import com.saidao.backend.service.ProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 用户管理接口（管理端，SecurityConfig 已限制 ADMIN 角色）
 */
@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProfileService profileService;
    private final UserProfileRepository userProfileRepository;
    private final ForumPostRepository forumPostRepository;
    private final ForumReplyRepository forumReplyRepository;
    private final UserFollowRepository userFollowRepository;
    private final CompetitionRepository competitionRepository;
    
    /** 获取所有用户（分页） */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<User>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<User> userPage = userRepository.findAll(pageable);
        PageResponse<User> response = PageResponse.of(
                userPage.getContent(), page, size, userPage.getTotalElements());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /** 按用户名搜索（认证用户可用，用于添加仓库成员） */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<User>>> searchUsers(@RequestParam String username) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        return ResponseEntity.ok(ApiResponse.success(
                userRepository.findTop10ByUsernameContainingIgnoreCase(username.trim())));
    }

    /** 获取单个用户 */
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> getUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return ResponseEntity.ok(ApiResponse.success(user));
    }
    
    /** 创建用户 */
    @PostMapping
    public ResponseEntity<ApiResponse<User>> createUser(@RequestBody User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null) {
            user.setRole(User.UserRole.STUDENT);
        }
        User savedUser = userRepository.save(user);
        log.info("用户创建成功: {}", savedUser.getUsername());
        return ResponseEntity.ok(ApiResponse.success("用户创建成功", savedUser));
    }
    
    /** 更新用户 */
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> updateUser(
            @PathVariable Long userId,
            @RequestBody User userDetails) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        user.setName(userDetails.getName());
        user.setRole(userDetails.getRole());
        user.setEmail(userDetails.getEmail());
        user.setPhone(userDetails.getPhone());
        user.setDepartment(userDetails.getDepartment());
        user.setStudentId(userDetails.getStudentId());
        user.setCompany(userDetails.getCompany());
        
        User updatedUser = userRepository.save(user);
        log.info("用户信息已更新: {}", updatedUser.getUsername());
        return ResponseEntity.ok(ApiResponse.success("用户信息已更新", updatedUser));
    }
    
    /** 删除用户 */
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long userId) {
        userRepository.deleteById(userId);
        log.info("用户已删除: {}", userId);
        return ResponseEntity.ok(ApiResponse.success("用户已删除", null));
    }
    
    /** 重置用户密码 */
    @PutMapping("/{userId}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        user.setPassword(passwordEncoder.encode("123456"));
        userRepository.save(user);
        log.info("用户密码已重置: {}", user.getUsername());
        return ResponseEntity.ok(ApiResponse.success("密码已重置为：123456", null));
    }
    
    /** 切换用户身份认证状态(管理员) */
    @PutMapping("/{userId}/verify")
    public ResponseEntity<ApiResponse<Boolean>> verify(@PathVariable Long userId) {
        boolean now = profileService.toggleVerified(userId);
        return ResponseEntity.ok(ApiResponse.success(
                now ? "已认证该用户身份" : "已取消认证", now));
    }

    /** 用户主页:公开画像 + 发帖/回复统计 + 关注/粉丝数 */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<ApiResponse<UserProfileDTO>> getUserProfile(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);

        int postCount = (int) forumPostRepository.findAll().stream()
                .filter(p -> p.getAuthor() != null && p.getAuthor().getId().equals(userId))
                .count();
        List<ForumReply> userReplies = forumReplyRepository.findAll().stream()
                .filter(r -> r.getAuthor() != null && r.getAuthor().getId().equals(userId))
                .collect(Collectors.toList());
        int replyCount = userReplies.size();
        int acceptedCount = (int) userReplies.stream()
                .filter(r -> Boolean.TRUE.equals(r.getAccepted()))
                .count();

        // 参赛历史:从该用户的帖子中提取竞赛名
        List<Long> compIds = forumPostRepository.findAll().stream()
                .filter(p -> p.getAuthor() != null && p.getAuthor().getId().equals(userId))
                .map(ForumPost::getCompetitionId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        List<String> compHistory = compIds.isEmpty() ? List.of()
                : competitionRepository.findAllById(compIds).stream()
                        .map(Competition::getName)
                        .collect(Collectors.toList());

        long followingCount = userFollowRepository.countByFollowerId(userId);
        long followerCount = userFollowRepository.countByFolloweeId(userId);

        UserProfileDTO dto = new UserProfileDTO(
                user.getId(),
                user.getName(),
                user.getAvatarUrl(),
                profile != null ? profile.getSchool() : null,
                user.getReputation(),
                profile != null ? profile.getVerified() : null,
                user.getRole() == null ? null : user.getRole().name(),
                postCount,
                replyCount,
                acceptedCount,
                compHistory,
                (int) followingCount,
                (int) followerCount
        );
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
