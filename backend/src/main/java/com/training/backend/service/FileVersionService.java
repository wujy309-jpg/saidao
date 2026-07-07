package com.training.backend.service;

import com.training.backend.entity.FileComment;
import com.training.backend.entity.FileVersion;
import com.training.backend.repository.FileCommentRepository;
import com.training.backend.repository.FileVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileVersionService {
    
    private final FileVersionRepository fileVersionRepository;
    private final FileCommentRepository fileCommentRepository;
    
    private final String uploadDir = "./uploads/versions";
    
    @Transactional
    public FileVersion uploadNewVersion(Long materialId, Long uploaderId, MultipartFile file, String changeDescription) throws IOException {
        fileVersionRepository.resetCurrentVersion(materialId);
        
        Integer currentVersion = fileVersionRepository.getMaxVersionNumber(materialId);
        Integer newVersion = currentVersion + 1;
        
        String fileName = file.getOriginalFilename();
        String fileType = file.getContentType();
        Long fileSize = file.getSize();
        String fileHash = calculateFileHash(file.getBytes());
        
        String storedFileName = UUID.randomUUID().toString() + "_" + fileName;
        Path filePath = Paths.get(uploadDir, storedFileName);
        Files.createDirectories(filePath.getParent());
        Files.write(filePath, file.getBytes());
        
        FileVersion version = FileVersion.builder()
                .materialId(materialId)
                .uploaderId(uploaderId)
                .fileName(fileName)
                .fileType(fileType)
                .fileSize(fileSize)
                .filePath(filePath.toString())
                .fileHash(fileHash)
                .versionNumber(newVersion)
                .changeDescription(changeDescription)
                .isCurrent(true)
                .build();
        
        FileVersion savedVersion = fileVersionRepository.save(version);
        log.info("文件版本上传成功: materialId={}, version={}", materialId, newVersion);
        
        return savedVersion;
    }
    
    public List<FileVersion> getVersionHistory(Long materialId) {
        return fileVersionRepository.findByMaterialIdOrderByVersionNumberDesc(materialId);
    }
    
    public FileVersion getCurrentVersion(Long materialId) {
        return fileVersionRepository.findByMaterialIdAndIsCurrentTrue(materialId)
                .orElse(null);
    }
    
    public FileVersion getVersion(Long materialId, Integer versionNumber) {
        return fileVersionRepository.findByMaterialIdAndVersionNumber(materialId, versionNumber)
                .orElse(null);
    }
    
    @Transactional
    public FileVersion rollbackToVersion(Long materialId, Integer versionNumber) {
        FileVersion targetVersion = getVersion(materialId, versionNumber);
        if (targetVersion == null) {
            throw new RuntimeException("版本不存在");
        }
        
        fileVersionRepository.resetCurrentVersion(materialId);
        targetVersion.setIsCurrent(true);
        
        return fileVersionRepository.save(targetVersion);
    }
    
    @Transactional
    public FileComment addComment(Long materialId, Long versionId, Long userId, String content, Long parentId) {
        FileComment comment = FileComment.builder()
                .materialId(materialId)
                .versionId(versionId)
                .userId(userId)
                .content(content)
                .build();
        
        if (parentId != null) {
            FileComment parent = fileCommentRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("父评论不存在"));
            comment.setParent(parent);
        }
        
        return fileCommentRepository.save(comment);
    }
    
    public List<FileComment> getComments(Long materialId) {
        return fileCommentRepository.findByMaterialIdAndParentIsNullOrderByCreatedAtDesc(materialId);
    }
    
    public List<FileComment> getVersionComments(Long versionId) {
        return fileCommentRepository.findByVersionIdOrderByCreatedAtAsc(versionId);
    }
    
    private String calculateFileHash(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("计算文件哈希失败", e);
        }
    }
}
