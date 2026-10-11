package com.saidao.backend.controller;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.service.AuditService;
import com.saidao.backend.service.DataImportService;
import com.saidao.backend.service.LinkHealthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 数据维护后台接口：链接体检 + 竞赛数据批量导入。
 *
 * <p>整个 {@code /admin-api/**} 由 SecurityConfig 限定为 ADMIN，无需另行鉴权。
 */
@Slf4j
@RestController
@RequestMapping("/admin-api/data")
@RequiredArgsConstructor
public class DataAdminController {

    private final LinkHealthService linkHealthService;
    private final DataImportService dataImportService;
    private final AuditService auditService;

    /* ==================== 链接体检 ==================== */

    /** 体检汇总：各类计数 + 失效清单 */
    @GetMapping("/link-health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> linkHealth() {
        return ResponseEntity.ok(ApiResponse.success(linkHealthService.summary()));
    }

    /**
     * 立即体检（同步执行）。
     *
     * <p>163 条链接 × 4 线程大约一两分钟，前端需要给出等待态。之所以不放到异步任务里，
     * 是为了让管理员点完就能看到结果，不用去翻日志。
     */
    @PostMapping("/link-health/check")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkLinks() {
        long start = System.currentTimeMillis();
        Map<String, Object> result = linkHealthService.checkAll();
        long cost = System.currentTimeMillis() - start;
        auditService.logAction(currentUserId(), currentUsername(), "DATA_LINK_CHECK", "COMPETITION", null,
                "链接体检完成，耗时 " + cost + "ms，失效 "
                        + result.get("competitionBroken") + " 个官网 / "
                        + result.get("workBroken") + " 条作品链接", true, null);
        return ResponseEntity.ok(ApiResponse.success("体检完成", result));
    }

    /* ==================== 批量导入 ==================== */

    /** 竞赛批量导入：dryRun=true 只预览不落库 */
    @PostMapping("/competitions/import")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importCompetitions(@RequestBody Map<String, Object> body) {
        boolean dryRun = !Boolean.FALSE.equals(body.get("dryRun"));
        List<Map<String, Object>> items = itemsOf(body);
        Map<String, Object> report = dataImportService.importCompetitions(items, dryRun);
        if (!dryRun) {
            auditService.logAction(currentUserId(), currentUsername(), "DATA_IMPORT_COMPETITION", "COMPETITION", null,
                    String.format("竞赛导入：共 %s 条，新增 %s，更新 %s，异常 %s",
                            report.get("total"), report.get("created"), report.get("updated"), report.get("invalidCount")),
                    true, null);
        }
        return ResponseEntity.ok(ApiResponse.success(dryRun ? "预览完成（未落库）" : "导入完成", report));
    }

    /** 优秀作品批量导入：dryRun=true 只预览不落库 */
    @PostMapping("/works/import")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importWorks(@RequestBody Map<String, Object> body) {
        boolean dryRun = !Boolean.FALSE.equals(body.get("dryRun"));
        List<Map<String, Object>> items = itemsOf(body);
        Map<String, Object> report = dataImportService.importWorks(items, dryRun);
        if (!dryRun) {
            auditService.logAction(currentUserId(), currentUsername(), "DATA_IMPORT_WORK", "EXCELLENT_WORK", null,
                    String.format("优秀作品导入：共 %s 条，新增 %s，更新 %s，异常 %s",
                            report.get("total"), report.get("created"), report.get("updated"), report.get("invalidCount")),
                    true, null);
        }
        return ResponseEntity.ok(ApiResponse.success(dryRun ? "预览完成（未落库）" : "导入完成", report));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> itemsOf(Map<String, Object> body) {
        Object items = body.get("items");
        if (!(items instanceof List<?> list)) {
            throw new IllegalArgumentException("缺少 items 数组");
        }
        return (List<Map<String, Object>>) list;
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        return null;
    }

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? "unknown" : String.valueOf(auth.getName());
    }
}
