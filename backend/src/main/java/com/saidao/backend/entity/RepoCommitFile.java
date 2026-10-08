package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A point-in-time snapshot of a repository file after a commit.
 * Text content is retained for diff/rollback; binary files keep metadata only.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "repo_commit_files", indexes = {
        @Index(name = "idx_rcf_commit", columnList = "commit_id"),
        @Index(name = "idx_rcf_path", columnList = "commit_id,file_path")
})
public class RepoCommitFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commit_id", nullable = false)
    private RepoCommit commit;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Lob
    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "binary_file", nullable = false)
    private boolean binaryFile;

    @Lob
    @Column(name = "binary_content")
    private byte[] binaryContent;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "captured_at")
    private LocalDateTime capturedAt;

    @PrePersist
    protected void onCreate() {
        if (capturedAt == null) capturedAt = LocalDateTime.now();
    }
}
