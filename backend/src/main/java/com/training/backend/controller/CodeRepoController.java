package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.*;
import com.training.backend.entity.RepoMember.MemberRole;
import com.training.backend.service.CodeRepoService;
import com.training.backend.service.CodeRepoService.CommitFileEntry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/code-repos")
@RequiredArgsConstructor
public class CodeRepoController {

    private final CodeRepoService codeRepoService;

    @PostMapping
    public ResponseEntity<ApiResponse<CodeRepository>> createRepository(
            @RequestBody CodeRepository repo,
            @RequestParam Long ownerId,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long teamId) {
        CodeRepository created = codeRepoService.createRepository(repo, ownerId, projectId, teamId);
        return ResponseEntity.ok(ApiResponse.success("项目空间创建成功", created));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<CodeRepository>>> getUserRepositories(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getUserRepositories(userId)));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<CodeRepository>>> getAllRepositories() {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getAllRepositories()));
    }

    @GetMapping("/{repoId}")
    public ResponseEntity<ApiResponse<CodeRepository>> getRepository(@PathVariable Long repoId) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getRepository(repoId)));
    }

    /** 删除项目空间（仅 OWNER 或管理员） */
    @DeleteMapping("/{repoId}")
    public ResponseEntity<ApiResponse<Void>> deleteRepository(
            @PathVariable Long repoId, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        MemberRole role = codeRepoService.getMemberRole(repoId, userId);
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (role != MemberRole.OWNER && !isAdmin) {
            throw new AccessDeniedException("只有项目所有者或管理员可以删除项目空间");
        }
        codeRepoService.deleteRepository(repoId);
        return ResponseEntity.ok(ApiResponse.success("项目空间已删除", null));
    }

    @PostMapping("/{repoId}/members")
    public ResponseEntity<ApiResponse<RepoMember>> addMember(
            @PathVariable Long repoId,
            @RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        MemberRole role = MemberRole.valueOf(body.get("role").toString());
        Long inviterId = Long.valueOf(body.get("inviterId").toString());
        RepoMember member = codeRepoService.addMember(repoId, userId, role, inviterId);
        return ResponseEntity.ok(ApiResponse.success("成员添加成功", member));
    }

    @DeleteMapping("/{repoId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long repoId, @PathVariable Long userId) {
        codeRepoService.removeMember(repoId, userId);
        return ResponseEntity.ok(ApiResponse.success("成员移除成功", null));
    }

    @PutMapping("/{repoId}/members/{userId}/role")
    public ResponseEntity<ApiResponse<RepoMember>> updateMemberRole(
            @PathVariable Long repoId,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        MemberRole role = MemberRole.valueOf(body.get("role"));
        RepoMember member = codeRepoService.updateMemberRole(repoId, userId, role);
        return ResponseEntity.ok(ApiResponse.success("角色更新成功", member));
    }

    @GetMapping("/{repoId}/members")
    public ResponseEntity<ApiResponse<List<RepoMember>>> getMembers(@PathVariable Long repoId) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getMembers(repoId)));
    }

    @PostMapping("/{repoId}/branches")
    public ResponseEntity<ApiResponse<RepoBranch>> createBranch(
            @PathVariable Long repoId,
            @RequestBody Map<String, String> body) {
        RepoBranch branch = codeRepoService.createBranch(
                repoId, body.get("name"), body.get("baseBranch"), Long.valueOf(body.get("userId")));
        return ResponseEntity.ok(ApiResponse.success("分支创建成功", branch));
    }

    @GetMapping("/{repoId}/branches")
    public ResponseEntity<ApiResponse<List<RepoBranch>>> getBranches(@PathVariable Long repoId) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getBranches(repoId)));
    }

    @GetMapping("/{repoId}/files")
    public ResponseEntity<ApiResponse<List<RepoFile>>> getFiles(
            @PathVariable Long repoId,
            @RequestParam String branch,
            @RequestParam(required = false) String path) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getFiles(repoId, branch, path)));
    }

    /** 文件内容（磁盘存储的小文本文件也支持预览） */
    @GetMapping("/{repoId}/files/**")
    public ResponseEntity<ApiResponse<RepoFile>> getFile(
            @PathVariable Long repoId,
            @RequestParam String branch,
            @RequestParam String path) {
        RepoFile file = codeRepoService.getFile(repoId, branch, path);
        if (file.getStoragePath() != null && file.getFileSize() != null && file.getFileSize() <= 1024 * 1024) {
            try {
                String content = Files.readString(Paths.get(file.getStoragePath()), StandardCharsets.UTF_8);
                file.setContent(content);
            } catch (Exception e) {
                log.debug("磁盘文件预览失败（可能是二进制）: {}", e.getMessage());
            }
        }
        return ResponseEntity.ok(ApiResponse.success(file));
    }

    /** 上传任意类型文件（代码/PPT/文档等），存磁盘，自动生成提交记录 */
    @PostMapping("/{repoId}/files/upload")
    public ResponseEntity<ApiResponse<RepoFile>> uploadFile(
            @PathVariable Long repoId,
            @RequestParam("file") MultipartFile file,
            @RequestParam String branch,
            @RequestParam(required = false, defaultValue = "") String path,
            @RequestParam Long authorId) throws IOException {
        if (file.isEmpty()) {
            throw new RuntimeException("上传文件为空");
        }
        String fileName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String dir = path == null ? "" : path.trim().replace('\\', '/');
        String relPath = dir.isEmpty() ? fileName : dir + "/" + fileName;
        if (relPath.contains("..")) {
            throw new RuntimeException("非法文件路径");
        }

        Path base = Paths.get(codeRepoService.getUploadDir(), "repos",
                String.valueOf(repoId), branch).toAbsolutePath().normalize();
        Path target = base.resolve(relPath).normalize();
        if (!target.startsWith(base)) {
            throw new RuntimeException("非法文件路径");
        }
        Files.createDirectories(target.getParent());
        file.transferTo(target.toFile());

        RepoFile saved = codeRepoService.uploadFile(repoId, branch, relPath,
                target.toString(), file.getSize(), authorId);

        // 自动生成提交记录
        try {
            var branchEntity = codeRepoService.findBranchByName(repoId, branch);
            if (branchEntity != null) {
                List<CommitFileEntry> entries = List.of();
                codeRepoService.createCommit(repoId, branchEntity.getId(),
                        "上传 " + fileName, "", entries, authorId);
            }
        } catch (Exception e) {
            log.warn("上传后自动生成提交记录失败: {}", e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.success("上传成功", saved));
    }

    /** 下载文件（任意类型，按原始文件名下载） */
    @GetMapping("/{repoId}/files/download")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long repoId,
            @RequestParam String branch,
            @RequestParam String path) throws IOException {
        RepoFile file = codeRepoService.getFile(repoId, branch, path);

        byte[] data;
        if (file.getStoragePath() != null) {
            data = Files.readAllBytes(Paths.get(file.getStoragePath()));
        } else {
            data = file.getContent() == null ? new byte[0] : file.getContent().getBytes(StandardCharsets.UTF_8);
        }

        String encoded = URLEncoder.encode(file.getFileName(), StandardCharsets.UTF_8).replace("+", "%20");
        MediaType mediaType = guessMediaType(file.getFileName());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                .contentType(mediaType)
                .contentLength(data.length)
                .body(new ByteArrayResource(data));
    }

    @PostMapping("/{repoId}/commits")
    public ResponseEntity<ApiResponse<RepoCommit>> createCommit(
            @PathVariable Long repoId,
            @RequestBody Map<String, Object> body) {
        Long branchId = Long.valueOf(body.get("branchId").toString());
        String message = body.get("message").toString();
        String description = body.get("description") != null ? body.get("description").toString() : "";
        Long authorId = Long.valueOf(body.get("authorId").toString());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fileEntries = (List<Map<String, Object>>) body.get("files");
        List<CommitFileEntry> files = fileEntries.stream().map(entry -> {
            CommitFileEntry e = new CommitFileEntry();
            e.path = entry.get("path").toString();
            e.content = entry.get("content") != null ? entry.get("content").toString() : "";
            e.deleted = entry.get("deleted") != null && (Boolean) entry.get("deleted");
            return e;
        }).collect(java.util.stream.Collectors.toList());

        RepoCommit commit = codeRepoService.createCommit(repoId, branchId, message, description, files, authorId);
        return ResponseEntity.ok(ApiResponse.success("提交成功", commit));
    }

    @GetMapping("/{repoId}/commits")
    public ResponseEntity<ApiResponse<List<RepoCommit>>> getCommits(
            @PathVariable Long repoId,
            @RequestParam(required = false) Long branchId) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getCommits(repoId, branchId)));
    }

    @GetMapping("/commits/{commitId}")
    public ResponseEntity<ApiResponse<RepoCommit>> getCommit(@PathVariable Long commitId) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getCommit(commitId)));
    }

    @GetMapping("/{repoId}/commits/search")
    public ResponseEntity<ApiResponse<List<RepoCommit>>> searchCommits(
            @PathVariable Long repoId,
            @RequestParam String keyword) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.searchCommits(repoId, keyword)));
    }

    private MediaType guessMediaType(String fileName) {
        String name = fileName == null ? "" : fileName.toLowerCase();
        if (name.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (name.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (name.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        if (name.endsWith(".ppt") || name.endsWith(".pptx"))
            return MediaType.parseMediaType("application/vnd.ms-powerpoint");
        if (name.endsWith(".doc") || name.endsWith(".docx"))
            return MediaType.parseMediaType("application/msword");
        if (name.endsWith(".xls") || name.endsWith(".xlsx"))
            return MediaType.parseMediaType("application/vnd.ms-excel");
        if (name.endsWith(".zip")) return MediaType.parseMediaType("application/zip");
        if (name.endsWith(".mp4")) return MediaType.parseMediaType("video/mp4");
        if (name.endsWith(".mp3")) return MediaType.parseMediaType("audio/mpeg");
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
