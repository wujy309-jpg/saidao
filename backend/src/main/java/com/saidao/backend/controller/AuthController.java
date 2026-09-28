package com.saidao.backend.controller;

import com.saidao.backend.dto.*;
import com.saidao.backend.entity.User;
import com.saidao.backend.service.AuthService;
import com.saidao.backend.util.JwtUtil;
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
    private final com.saidao.backend.service.TokenService tokenService;
    
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        LoginResponse response = authService.login(request, httpRequest);
        // 登录发放每日免费额度（按天防重复，不阻塞登录）
        if (response.getUser() != null && response.getUser().getId() != null) {
            try {
                tokenService.grantDailyFree(response.getUser().getId());
            } catch (Exception e) {
                log.warn("每日免费额度发放失败: {}", e.getMessage());
            }
        }
        return ResponseEntity.ok(ApiResponse.success("登录成功", response));
    }
    
    /** 学生自助注册 */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<User>> register(@Valid @RequestBody RegisterRequest request) {
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setName(request.getName());
        user.setRole(User.UserRole.STUDENT);
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setStudentId(request.getStudentId());
        user.setDepartment(request.getDiscipline());
        
        User registered = authService.registerStudent(user);
        // 注册赠送体验 Token
        try {
            tokenService.grantRegisterBonus(registered.getId());
        } catch (Exception e) {
            log.warn("注册赠送 Token 发放失败: {}", e.getMessage());
        }
        return ResponseEntity.ok(ApiResponse.success("注册成功", registered));
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
    
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody ChangePasswordRequest request) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        authService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.success("密码修改成功", null));
    }
}
