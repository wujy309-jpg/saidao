package com.saidao.backend.controller;

import com.saidao.backend.dto.AccountDTO;
import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.dto.UpdateAvatarPresetRequest;
import com.saidao.backend.dto.UpdateNameRequest;
import com.saidao.backend.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * 账号自助设置：查看本人账号、改昵称、换头像（上传/预设/恢复默认）。
 *
 * <p>路径刻意避开 {@code /users/**}（SecurityConfig 里是 ADMIN 专属），
 * 这里登录即可访问，且所有操作都只作用于「当前登录用户」，不接受 userId 参数。
 *
 * <p>除 {@code GET /me} 外，写操作统一返回最新的账号视图，前端一次往返即可同步顶栏昵称/头像。
 */
@RestController
@RequestMapping("/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    /** 当前账号信息 */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AccountDTO>> me() {
        return ResponseEntity.ok(ApiResponse.success(accountService.view(currentUserId())));
    }

    /** 修改展示昵称 */
    @PutMapping("/name")
    public ResponseEntity<ApiResponse<AccountDTO>> updateName(@Valid @RequestBody UpdateNameRequest request) {
        Long userId = currentUserId();
        String name = accountService.updateName(userId, request.name());
        return ResponseEntity.ok(ApiResponse.success("昵称已更新为「" + name + "」", accountService.view(userId)));
    }

    /** 上传自定义头像（multipart 字段名固定为 file） */
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AccountDTO>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        Long userId = currentUserId();
        accountService.uploadAvatar(userId, file);
        return ResponseEntity.ok(ApiResponse.success("头像已更新", accountService.view(userId)));
    }

    /** 选用系统预设头像 */
    @PutMapping("/avatar/preset")
    public ResponseEntity<ApiResponse<AccountDTO>> usePresetAvatar(
            @Valid @RequestBody UpdateAvatarPresetRequest request) {
        Long userId = currentUserId();
        accountService.usePresetAvatar(userId, request.presetId());
        return ResponseEntity.ok(ApiResponse.success("已换上预设头像", accountService.view(userId)));
    }

    /** 恢复默认头像（回到昵称首字色块，并删除已上传的图片） */
    @DeleteMapping("/avatar")
    public ResponseEntity<ApiResponse<AccountDTO>> resetAvatar() {
        Long userId = currentUserId();
        accountService.resetAvatar(userId);
        return ResponseEntity.ok(ApiResponse.success("已恢复默认头像", accountService.view(userId)));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
}
