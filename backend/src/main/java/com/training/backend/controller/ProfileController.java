package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.SaveProfileRequest;
import com.training.backend.entity.UserProfile;
import com.training.backend.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * 用户画像接口
 */
@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {
    
    private final ProfileService profileService;
    
    @GetMapping
    public ResponseEntity<ApiResponse<UserProfile>> getProfile() {
        Long userId = currentUserId();
        return ResponseEntity.ok(ApiResponse.success(profileService.get(userId)));
    }
    
    @PutMapping
    public ResponseEntity<ApiResponse<UserProfile>> saveProfile(@Valid @RequestBody SaveProfileRequest request) {
        Long userId = currentUserId();
        return ResponseEntity.ok(ApiResponse.success("画像已保存", profileService.save(userId, request)));
    }
    
    /** 批量查询用户身份信息(社区作者卡片):/api/profile/batch?ids=1,2,3 */
    @GetMapping("/batch")
    public ResponseEntity<ApiResponse<java.util.Map<Long, java.util.Map<String, Object>>>> batch(
            @RequestParam String ids) {
        java.util.List<Long> list = new java.util.ArrayList<>();
        for (String s : ids.split(",")) {
            try {
                list.add(Long.parseLong(s.trim()));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(ApiResponse.success(profileService.batchIdentity(list)));
    }
    
    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
}
