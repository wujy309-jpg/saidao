package com.saidao.backend.controller;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.entity.ForumReport;
import com.saidao.backend.service.ForumService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 论坛管理接口（仅 ADMIN，SecurityConfig 已限制 /admin-api/**） */
@RestController
@RequestMapping("/admin-api/forum")
@RequiredArgsConstructor
public class ForumAdminController {

    private final ForumService forumService;

    /** 举报审核队列 */
    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<List<ForumReport>>> listReports(
            @RequestParam(required = false) ForumReport.ReportStatus status) {
        return ResponseEntity.ok(ApiResponse.success(forumService.listReports(status)));
    }

    /** 处理举报：APPROVED→隐藏内容 / REJECTED */
    @PutMapping("/reports/{id}")
    public ResponseEntity<ApiResponse<ForumReport>> handleReport(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        Long handlerId = currentUserIdOrNull();
        ForumReport.ReportStatus decision = ForumReport.ReportStatus.valueOf(
                body.getOrDefault("decision", "REJECTED").toUpperCase());
        return ResponseEntity.ok(ApiResponse.success("处理完成",
                forumService.handleReport(id, handlerId, decision)));
    }

    private Long currentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        try {
            return Long.parseLong(auth.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
