package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.PageResponse;
import com.training.backend.entity.User;
import com.training.backend.repository.UserRepository;
import com.training.backend.util.JwtUtil;
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
import java.util.Map;

/**
 * 用户控制器
 */
@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    
    /**
     * 验证管理员权限
     */
    private void verifyAdminRole(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new RuntimeException("未提供认证令牌");
        }
        String role = jwtUtil.getRoleFromToken(token.replace("Bearer ", ""));
        if (!"ADMIN".equals(role)) {
            throw new RuntimeException("需要管理员权限");
        }
    }
    
    /**
     * 获取所有用户（分页）
     */
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
    
    /**
     * 获取单个用户
     */
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> getUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return ResponseEntity.ok(ApiResponse.success(user));
    }
    
    /**
     * 创建用户（仅管理员）
     */
    @PostMapping
    public ResponseEntity<ApiResponse<User>> createUser(
            @RequestBody User user,
            @RequestHeader("Authorization") String token) {
        verifyAdminRole(token);
        // 检查用户名是否已存在
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }
        
        // 加密密码
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        User savedUser = userRepository.save(user);
        log.info("用户创建成功: {}", savedUser.getUsername());
        return ResponseEntity.ok(ApiResponse.success("用户创建成功", savedUser));
    }
    
    /**
     * 更新用户
     */
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
    
    /**
     * 删除用户（仅管理员）
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String token) {
        verifyAdminRole(token);
        userRepository.deleteById(userId);
        log.info("用户已删除: {}", userId);
        return ResponseEntity.ok(ApiResponse.success("用户已删除", null));
    }
    
    /**
     * 重置用户密码（仅管理员）
     */
    @PutMapping("/{userId}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String token) {
        verifyAdminRole(token);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        user.setPassword(passwordEncoder.encode("123456"));
        userRepository.save(user);
        
        log.info("用户密码已重置: {}", user.getUsername());
        return ResponseEntity.ok(ApiResponse.success("密码已重置为：123456", null));
    }
    
    /**
     * 获取用户统计信息
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUserStatistics() {
        long totalUsers = userRepository.count();
        long adminCount = userRepository.countByRole(User.UserRole.ADMIN);
        long teacherCount = userRepository.countByRole(User.UserRole.TEACHER);
        long studentCount = userRepository.countByRole(User.UserRole.STUDENT);
        long enterpriseCount = userRepository.countByRole(User.UserRole.ENTERPRISE);
        
        Map<String, Long> stats = Map.of(
                "total", totalUsers,
                "admin", adminCount,
                "teacher", teacherCount,
                "student", studentCount,
                "enterprise", enterpriseCount
        );
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
