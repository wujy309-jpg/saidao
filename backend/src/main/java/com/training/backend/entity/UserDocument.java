package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户上传的竞赛资料(规则/要求/笔记),注入 AI 助手上下文
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_documents", indexes = {
    @Index(name = "idx_udoc_user", columnList = "user_id"),
    @Index(name = "idx_udoc_comp", columnList = "competition_id")
})
public class UserDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "competition_id", nullable = false)
    private Long competitionId;

    @Column(name = "file_name", nullable = false, length = 200)
    private String fileName;

    @Column(name = "file_ext", length = 10)
    private String fileExt;

    @Column(name = "file_size")
    private Long fileSize;

    /** 磁盘存储路径 */
    @Column(name = "storage_path", length = 400)
    private String storagePath;

    /** 提取出的文本(注入上下文,上限约 10000 字) */
    @Column(name = "content_text", columnDefinition = "TEXT")
    private String contentText;

    /** 是否已成功解析(非持久化,接口返回用) */
    @Transient
    private Boolean hasText;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
