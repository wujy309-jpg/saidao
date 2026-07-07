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
@Table(name = "repo_commits")
public class RepoCommit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "commit_hash", nullable = false, unique = true, length = 64)
    private String commitHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private CodeRepository repository;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private RepoBranch branch;

    @Column(nullable = false, length = 200)
    private String message;

    @Column(length = 1000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "parent_hash", length = 64)
    private String parentHash;

    @Column(name = "files_changed")
    private Integer filesChanged;

    @Column(name = "additions")
    private Integer additions;

    @Column(name = "deletions")
    private Integer deletions;

    @Column(name = "committed_at")
    private LocalDateTime committedAt;

    @PrePersist
    protected void onCreate() {
        committedAt = LocalDateTime.now();
        if (filesChanged == null) filesChanged = 0;
        if (additions == null) additions = 0;
        if (deletions == null) deletions = 0;
    }
}
