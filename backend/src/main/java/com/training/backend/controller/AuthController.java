package com.training.backend.controller;

import com.training.backend.dto.*;
import com.training.backend.entity.User;
import com.training.backend.service.AuthService;
import com.training.backend.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        LoginResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("登录成功", response));
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenRefreshResponse>> refreshToken(
            @Valid @RequestBody TokenRefreshRequest request) {
        TokenRefreshResponse response = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Token刷新成功", response));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) String refreshToken) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        authService.logout(userId, refreshToken);
        return ResponseEntity.ok(ApiResponse.success("登出成功", null));
    }
    
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<User>> register(
            @Valid @RequestBody User user,
            @RequestHeader("Authorization") String token) {
        String role = jwtUtil.getRoleFromToken(token.replace("Bearer ", ""));
        if (!"ADMIN".equals(role)) {
            throw new RuntimeException("只有管理员可以创建用户");
        }
        Long operatorId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        User registeredUser = authService.register(user, operatorId);
        return ResponseEntity.ok(ApiResponse.success("用户创建成功", registeredUser));
    }
    
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody ChangePasswordRequest request) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        authService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.success("密码修改成功", null));
    }
}
