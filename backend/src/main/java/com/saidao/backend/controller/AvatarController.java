package com.saidao.backend.controller;

import com.saidao.backend.service.AvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

/**
 * 头像图片读取出口。
 *
 * <p>为什么不直接挂静态资源处理器（如 {@code /uploads/**}）：
 * <ol>
 *   <li>{@code uploads/} 下还躺着用户上传的比赛资料，整目录对外可读会连私有文档一起暴露；
 *       这里只暴露 {@code avatars/} 一个子目录，且路径参数是 Long，不存在目录穿越。</li>
 *   <li>URL 不带文件后缀（{@code /api/avatars/7}），避免被 nginx 的
 *       {@code \.(png|jpg|...)$} 规则截走去当静态文件找，从而绕过后端。</li>
 *   <li>响应头由后端统一控制：图片类型固定为 PNG，缓存用「版本号 + 长缓存」，
 *       换头像时 URL 里的 {@code ?v=} 会变，所以既省流量又不会看到旧头像。</li>
 * </ol>
 */
@RestController
@RequestMapping("/avatars")
@RequiredArgsConstructor
public class AvatarController {

    private final AvatarService avatarService;

    /** 读取用户头像；该用户没有上传过头像时返回 404，前端据此回退到首字色块或预设头像 */
    @GetMapping("/{userId}")
    public ResponseEntity<Resource> avatar(@PathVariable Long userId) {
        Path path = avatarService.fileOf(userId);
        if (!Files.isReadable(path) || !Files.isRegularFile(path)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .body(new FileSystemResource(path));
    }
}
