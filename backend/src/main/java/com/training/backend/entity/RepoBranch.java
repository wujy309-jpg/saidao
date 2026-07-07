package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "repo_branches", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"repository_id", "name"})
})
public class RepoBranch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private CodeRepository repository;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "latest_commit_id", length = 64)
    private String latestCommitId;

    @Column(name = "is_protected")
    private Boolean isProtected;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isProtected == null) isProtected = false;
    }
}
