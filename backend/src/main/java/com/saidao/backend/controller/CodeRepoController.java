package com.saidao.backend.controller;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.dto.RepoDtos;
import com.saidao.backend.entity.*;
import com.saidao.backend.entity.RepoMember.MemberRole;
import com.saidao.backend.service.CodeRepoService;
import com.saidao.backend.service.CodeRepoService.CommitFileEntry;
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
    public ResponseEntity<ApiResponse<RepoDtos.RepositoryView>> createRepository(
            @RequestBody CodeRepository repo,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long teamId,
            Authentication auth) {
        CodeRepository created = codeRepoService.createRepository(repo, currentUserId(auth), projectId, teamId);
        return ResponseEntity.ok(ApiResponse.success("项目空间创建成功", RepoDtos.RepositoryView.from(created)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<RepoDtos.RepositoryView>>> getUserRepositories(@PathVariable Long userId, Authentication auth) {
        Long currentUserId = currentUserId(auth);
        if (!currentUserId.equals(userId)) {
            throw new AccessDeniedException("只能查看自己的项目空间");
        }
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getUserRepositories(currentUserId).stream()
                .map(RepoDtos.RepositoryView::from).toList()));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<RepoDtos.RepositoryView>>> getAllRepositories(Authentication auth) {
        Long userId = currentUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getUserRepositories(userId).stream()
                .map(RepoDtos.RepositoryView::from).toList()));
    }

    @GetMapping("/{repoId}")
    public ResponseEntity<ApiResponse<RepoDtos.RepositoryView>> getRepository(@PathVariable Long repoId, Authentication auth) {
        codeRepoService.requireReadAccess(repoId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(RepoDtos.RepositoryView.from(codeRepoService.getRepository(repoId))));
    }

    /** 删除项目空间（仅 OWNER 或管理员） */
    @DeleteMapping("/{repoId}")
    public ResponseEntity<ApiResponse<Void>> deleteRepository(
            @PathVariable Long repoId, Authentication auth) {
        Long userId = currentUserId(auth);
        MemberRole role = codeRepoService.getMemberRole(repoId, userId);
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (role != MemberRole.OWNER && !isAdmin) {
            throw new AccessDeniedException("只有项目所有者或管理员可以删除项目空间");
        }
        codeRepoService.deleteRepository(repoId, userId);
        return ResponseEntity.ok(ApiResponse.success("项目空间已删除", null));
    }

    @PostMapping("/{repoId}/members")
    public ResponseEntity<ApiResponse<RepoDtos.MemberView>> addMember(
            @PathVariable Long repoId,
            @RequestBody Map<String, Object> body, Authentication auth) {
        codeRepoService.requireManageAccess(repoId, currentUserId(auth));
        Long userId = Long.valueOf(body.get("userId").toString());
        MemberRole role = MemberRole.valueOf(body.get("role").toString());
        if (role == MemberRole.OWNER) throw new AccessDeniedException("不能通过邀请创建第二个所有者");
        RepoMember member = codeRepoService.addMember(repoId, userId, role, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success("成员添加成功", RepoDtos.MemberView.from(member)));
    }

    @DeleteMapping("/{repoId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long repoId, @PathVariable Long userId, Authentication auth) {
        codeRepoService.requireManageAccess(repoId, currentUserId(auth));
        if (currentUserId(auth).equals(userId)) throw new AccessDeniedException("不能移除自己");
        codeRepoService.removeMember(repoId, userId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success("成员移除成功", null));
    }

    @PutMapping("/{repoId}/members/{userId}/role")
    public ResponseEntity<ApiResponse<RepoDtos.MemberView>> updateMemberRole(
            @PathVariable Long repoId,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body, Authentication auth) {
        codeRepoService.requireManageAccess(repoId, currentUserId(auth));
        MemberRole role = MemberRole.valueOf(body.get("role"));
        if (role == MemberRole.OWNER) throw new AccessDeniedException("不能通过此接口转移所有权");
        RepoMember member = codeRepoService.updateMemberRole(repoId, userId, role, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success("角色更新成功", RepoDtos.MemberView.from(member)));
    }

    @GetMapping("/{repoId}/members")
    public ResponseEntity<ApiResponse<List<RepoDtos.MemberView>>> getMembers(@PathVariable Long repoId, Authentication auth) {
        codeRepoService.requireReadAccess(repoId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getMembers(repoId).stream()
                .map(RepoDtos.MemberView::from).toList()));
    }

    @PostMapping("/{repoId}/branches")
    public ResponseEntity<ApiResponse<RepoDtos.BranchView>> createBranch(
            @PathVariable Long repoId,
            @RequestBody Map<String, String> body, Authentication auth) {
        codeRepoService.requireWriteAccess(repoId, currentUserId(auth));
        RepoBranch branch = codeRepoService.createBranch(
                repoId, body.get("name"), body.get("baseBranch"), currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success("分支创建成功", RepoDtos.BranchView.from(branch)));
    }

    @GetMapping("/{repoId}/branches")
    public ResponseEntity<ApiResponse<List<RepoDtos.BranchView>>> getBranches(@PathVariable Long repoId, Authentication auth) {
        codeRepoService.requireReadAccess(repoId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getBranches(repoId).stream()
                .map(RepoDtos.BranchView::from).toList()));
    }

    @GetMapping("/{repoId}/files")
    public ResponseEntity<ApiResponse<List<RepoDtos.FileView>>> getFiles(
            @PathVariable Long repoId,
            @RequestParam String branch,
            @RequestParam(required = false) String path, Authentication auth) {
        codeRepoService.requireReadAccess(repoId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getFiles(repoId, branch, path).stream()
                .map(RepoDtos.FileView::from).toList()));
    }

    /** 文件内容（磁盘存储的小文本文件也支持预览） */
    @GetMapping("/{repoId}/files/**")
    public ResponseEntity<ApiResponse<RepoDtos.FileView>> getFile(
            @PathVariable Long repoId,
            @RequestParam String branch,
            @RequestParam String path, Authentication auth) {
        codeRepoService.requireReadAccess(repoId, currentUserId(auth));
        RepoFile file = codeRepoService.getFile(repoId, branch, path);
        if (file.getStoragePath() != null && file.getFileSize() != null && file.getFileSize() <= 1024 * 1024) {
            try {
                String content = Files.readString(Paths.get(file.getStoragePath()), StandardCharsets.UTF_8);
                file.setContent(content);
            } catch (Exception e) {
                log.debug("磁盘文件预览失败（可能是二进制）: {}", e.getMessage());
            }
        }
        return ResponseEntity.ok(ApiResponse.success(RepoDtos.FileView.from(file)));
    }

    /** 上传任意类型文件（代码/PPT/文档等），存磁盘，自动生成提交记录 */
    @PostMapping("/{repoId}/files/upload")
    public ResponseEntity<ApiResponse<RepoDtos.FileView>> uploadFile(
            @PathVariable Long repoId,
            @RequestParam("file") MultipartFile file,
            @RequestParam String branch,
            @RequestParam(required = false, defaultValue = "") String path,
            Authentication auth) throws IOException {
        codeRepoService.requireWriteAccess(repoId, currentUserId(auth));
        if (file.isEmpty()) {
            throw new RuntimeException("上传文件为空");
        }
        String fileName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String dir = path == null ? "" : path.trim().replace('\\', '/');
        String relPath = dir.isEmpty() ? fileName : dir + "/" + fileName;
        relPath = codeRepoService.normalizeRelativePath(relPath);
        Path target = codeRepoService.resolveUploadPath(repoId, branch, relPath);
        Files.createDirectories(target.getParent());
        file.transferTo(target.toFile());

        RepoFile saved = codeRepoService.uploadFile(repoId, branch, relPath,
                target.toString(), file.getSize(), currentUserId(auth));

        // 自动生成提交记录
        try {
            var branchEntity = codeRepoService.findBranchByName(repoId, branch);
            if (branchEntity != null) {
                List<CommitFileEntry> entries = List.of();
                codeRepoService.createCommit(repoId, branchEntity.getId(),
                        "上传 " + fileName, "", entries, currentUserId(auth));
            }
        } catch (Exception e) {
            log.warn("上传后自动生成提交记录失败: {}", e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.success("上传成功", RepoDtos.FileView.from(saved)));
    }

    /** 下载文件（任意类型，按原始文件名下载） */
    @GetMapping("/{repoId}/files/download")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long repoId,
            @RequestParam String branch,
            @RequestParam String path, Authentication auth) throws IOException {
        codeRepoService.requireReadAccess(repoId, currentUserId(auth));
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
    public ResponseEntity<ApiResponse<RepoDtos.CommitView>> createCommit(
            @PathVariable Long repoId,
            @RequestBody Map<String, Object> body, Authentication auth) {
        codeRepoService.requireWriteAccess(repoId, currentUserId(auth));
        Long branchId = Long.valueOf(body.get("branchId").toString());
        String message = body.get("message") == null ? "" : body.get("message").toString();
        if (message.isBlank()) throw new IllegalArgumentException("提交说明不能为空");
        String description = body.get("description") != null ? body.get("description").toString() : "";
        Long authorId = currentUserId(auth);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fileEntries = body.get("files") instanceof List<?>
                ? (List<Map<String, Object>>) body.get("files") : List.of();
        List<CommitFileEntry> files = fileEntries.stream().map(entry -> {
            CommitFileEntry e = new CommitFileEntry();
            e.path = entry.get("path").toString();
            e.content = entry.get("content") != null ? entry.get("content").toString() : "";
            e.deleted = entry.get("deleted") != null && (Boolean) entry.get("deleted");
            return e;
        }).collect(java.util.stream.Collectors.toList());

        RepoCommit commit = codeRepoService.createCommit(repoId, branchId, message, description, files, authorId);
        return ResponseEntity.ok(ApiResponse.success("提交成功", RepoDtos.CommitView.from(commit)));
    }

    @GetMapping("/{repoId}/commits")
    public ResponseEntity<ApiResponse<List<RepoDtos.CommitView>>> getCommits(
            @PathVariable Long repoId,
            @RequestParam(required = false) Long branchId, Authentication auth) {
        codeRepoService.requireReadAccess(repoId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getCommits(repoId, branchId).stream()
                .map(RepoDtos.CommitView::from).toList()));
    }

    @GetMapping("/commits/{commitId}")
    public ResponseEntity<ApiResponse<RepoDtos.CommitView>> getCommit(@PathVariable Long commitId, Authentication auth) {
        RepoCommit commit = codeRepoService.getCommit(commitId);
        codeRepoService.requireReadAccess(commit.getRepository().getId(), currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(RepoDtos.CommitView.from(commit)));
    }

    @GetMapping("/commits/{commitId}/files")
    public ResponseEntity<ApiResponse<List<RepoDtos.CommitFileView>>> getCommitFiles(
            @PathVariable Long commitId, Authentication auth) {
        RepoCommit commit = codeRepoService.getCommit(commitId);
        codeRepoService.requireReadAccess(commit.getRepository().getId(), currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getCommitFiles(commitId).stream()
                .map(RepoDtos.CommitFileView::from).toList()));
    }

    @GetMapping("/commits/{commitId}/diff")
    public ResponseEntity<ApiResponse<List<RepoDtos.DiffView>>> diffCommit(
            @PathVariable Long commitId, @RequestParam(required = false) String path, Authentication auth) {
        RepoCommit commit = codeRepoService.getCommit(commitId);
        codeRepoService.requireReadAccess(commit.getRepository().getId(), currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.diffCommit(commitId, path).stream()
                .map(d -> new RepoDtos.DiffView(d.filePath(), d.changeType(), d.beforeContent(), d.afterContent(),
                        d.binary(), d.additions(), d.deletions())).toList()));
    }

    @PostMapping("/{repoId}/commits/{commitId}/rollback")
    public ResponseEntity<ApiResponse<RepoDtos.CommitView>> rollbackCommit(
            @PathVariable Long repoId, @PathVariable Long commitId, Authentication auth) {
        RepoCommit rollback = codeRepoService.rollback(repoId, commitId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success("已生成回滚提交", RepoDtos.CommitView.from(rollback)));
    }

    @GetMapping("/{repoId}/commits/search")
    public ResponseEntity<ApiResponse<List<RepoDtos.CommitView>>> searchCommits(
            @PathVariable Long repoId,
            @RequestParam String keyword, Authentication auth) {
        codeRepoService.requireReadAccess(repoId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.searchCommits(repoId, keyword).stream()
                .map(RepoDtos.CommitView::from).toList()));
    }

    private Long currentUserId(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof Long id) return id;
        throw new AccessDeniedException("未登录");
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
