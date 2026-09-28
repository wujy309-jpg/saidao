package com.training.backend.service;

import com.training.backend.entity.UserDocument;
import com.training.backend.repository.UserDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 用户上传资料:存磁盘 + 提取文本(txt/md/pdf),注入 AI 助手上下文
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final UserDocumentRepository documentRepository;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    private static final long MAX_SIZE = 5 * 1024 * 1024;
    private static final int MAX_DOCS = 10;
    private static final int MAX_TEXT = 10000;

    public List<UserDocument> list(Long userId, Long competitionId) {
        return documentRepository.findByUserIdAndCompetitionIdOrderByCreatedAtDesc(userId, competitionId);
    }

    /** 供上下文注入:已解析文本的资料 */
    public List<UserDocument> listWithText(Long userId, Long competitionId) {
        return list(userId, competitionId).stream()
                .filter(d -> d.getContentText() != null && !d.getContentText().isBlank())
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public UserDocument upload(Long userId, Long competitionId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("请选择文件");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new RuntimeException("文件不能超过 5MB");
        }
        String original = file.getOriginalFilename() == null ? "未命名文件" : file.getOriginalFilename();
        String ext = extOf(original);
        if (!Set("txt", "md", "pdf").contains(ext)) {
            throw new RuntimeException("仅支持 txt / md / pdf 文件");
        }
        if (documentRepository.countByUserIdAndCompetitionId(userId, competitionId) >= MAX_DOCS) {
            throw new RuntimeException("最多上传 10 个资料,请先删除不再需要的");
        }

        String storedName = UUID.randomUUID() + "." + ext;
        // 绝对路径:相对路径会被 Tomcat 解析到其工作目录,导致 transferTo 失败
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize()
                .resolve("documents").resolve(String.valueOf(userId));
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(storedName);
            file.transferTo(target.toFile());

            String text = extractText(target, ext);

            UserDocument doc = new UserDocument();
            doc.setUserId(userId);
            doc.setCompetitionId(competitionId);
            doc.setFileName(original);
            doc.setFileExt(ext);
            doc.setFileSize(file.getSize());
            doc.setStoragePath(target.toString());
            doc.setContentText(text);
            return documentRepository.save(doc);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("资料上传失败", e);
            throw new RuntimeException("上传失败:" + e.getMessage());
        }
    }

    @Transactional
    public boolean delete(Long userId, Long docId) {
        UserDocument doc = documentRepository.findById(docId).orElse(null);
        if (doc == null || !doc.getUserId().equals(userId)) return false;
        try {
            if (doc.getStoragePath() != null) {
                Files.deleteIfExists(Paths.get(doc.getStoragePath()));
            }
        } catch (Exception e) {
            log.warn("删除磁盘文件失败: {}", e.getMessage());
        }
        documentRepository.delete(doc);
        return true;
    }

    private String extractText(Path path, String ext) {
        try {
            if ("pdf".equals(ext)) {
                try (PDDocument pdf = Loader.loadPDF(path.toFile())) {
                    String text = new PDFTextStripper().getText(pdf);
                    return cap(text);
                }
            }
            String text = Files.readString(path, StandardCharsets.UTF_8);
            return cap(text);
        } catch (Exception e) {
            log.warn("文本提取失败(仅存档): {}", e.getMessage());
            return null;
        }
    }

    private String cap(String s) {
        if (s == null) return null;
        String clean = s.replace("\u0000", " ").trim();
        return clean.length() > MAX_TEXT ? clean.substring(0, MAX_TEXT) : clean;
    }

    private String extOf(String name) {
        int i = name.lastIndexOf('.');
        return i >= 0 ? name.substring(i + 1).toLowerCase() : "";
    }

    private static java.util.Set<String> Set(String... vals) {
        return java.util.Set.of(vals);
    }
}
