package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.*;
import com.training.backend.entity.RepoMember.MemberRole;
import com.training.backend.service.CodeRepoService;
import com.training.backend.service.CodeRepoService.CommitFileEntry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
            @RequestParam(required = false) Long projectId) {
        CodeRepository created = codeRepoService.createRepository(repo, ownerId, projectId);
        return ResponseEntity.ok(ApiResponse.success("仓库创建成功", created));
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

    @GetMapping("/{repoId}/files/**")
    public ResponseEntity<ApiResponse<RepoFile>> getFile(
            @PathVariable Long repoId,
            @RequestParam String branch,
            @RequestParam String path) {
        return ResponseEntity.ok(ApiResponse.success(codeRepoService.getFile(repoId, branch, path)));
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
}
