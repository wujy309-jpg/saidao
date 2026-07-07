package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.FileComment;
import com.training.backend.entity.FileVersion;
import com.training.backend.service.FileVersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/file-versions")
@RequiredArgsConstructor
public class FileVersionController {
    
    private final FileVersionService fileVersionService;
    
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<FileVersion>> uploadVersion(
            @RequestParam Long materialId,
            @RequestParam Long uploaderId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String changeDescription) throws IOException {
        FileVersion version = fileVersionService.uploadNewVersion(materialId, uploaderId, file, changeDescription);
        return ResponseEntity.ok(ApiResponse.success("版本上传成功", version));
    }
    
    @GetMapping("/material/{materialId}")
    public ResponseEntity<ApiResponse<List<FileVersion>>> getVersionHistory(@PathVariable Long materialId) {
        List<FileVersion> versions = fileVersionService.getVersionHistory(materialId);
        return ResponseEntity.ok(ApiResponse.success(versions));
    }
    
    @GetMapping("/material/{materialId}/current")
    public ResponseEntity<ApiResponse<FileVersion>> getCurrentVersion(@PathVariable Long materialId) {
        FileVersion version = fileVersionService.getCurrentVersion(materialId);
        return ResponseEntity.ok(ApiResponse.success(version));
    }
    
    @GetMapping("/material/{materialId}/version/{versionNumber}")
    public ResponseEntity<ApiResponse<FileVersion>> getVersion(
            @PathVariable Long materialId,
            @PathVariable Integer versionNumber) {
        FileVersion version = fileVersionService.getVersion(materialId, versionNumber);
        return ResponseEntity.ok(ApiResponse.success(version));
    }
    
    @PostMapping("/material/{materialId}/rollback/{versionNumber}")
    public ResponseEntity<ApiResponse<FileVersion>> rollback(
            @PathVariable Long materialId,
            @PathVariable Integer versionNumber) {
        FileVersion version = fileVersionService.rollbackToVersion(materialId, versionNumber);
        return ResponseEntity.ok(ApiResponse.success("版本回滚成功", version));
    }
    
    @PostMapping("/comments")
    public ResponseEntity<ApiResponse<FileComment>> addComment(@RequestBody Map<String, Object> request) {
        Long materialId = Long.valueOf(request.get("materialId").toString());
        Long versionId = Long.valueOf(request.get("versionId").toString());
        Long userId = Long.valueOf(request.get("userId").toString());
        String content = request.get("content").toString();
        Long parentId = request.get("parentId") != null ? Long.valueOf(request.get("parentId").toString()) : null;
        
        FileComment comment = fileVersionService.addComment(materialId, versionId, userId, content, parentId);
        return ResponseEntity.ok(ApiResponse.success("评论添加成功", comment));
    }
    
    @GetMapping("/comments/material/{materialId}")
    public ResponseEntity<ApiResponse<List<FileComment>>> getComments(@PathVariable Long materialId) {
        List<FileComment> comments = fileVersionService.getComments(materialId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }
    
    @GetMapping("/comments/version/{versionId}")
    public ResponseEntity<ApiResponse<List<FileComment>>> getVersionComments(@PathVariable Long versionId) {
        List<FileComment> comments = fileVersionService.getVersionComments(versionId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }
}
