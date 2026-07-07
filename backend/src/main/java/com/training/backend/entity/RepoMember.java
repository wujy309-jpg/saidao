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
@Table(name = "repo_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"repository_id", "user_id"})
})
public class RepoMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private CodeRepository repository;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private MemberRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by")
    private User invitedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (role == null) role = MemberRole.DEVELOPER;
    }

    public enum MemberRole {
        OWNER("所有者"),
        MAINTAINER("维护者"),
        DEVELOPER("开发者"),
        REPORTER("报告者"),
        GUEST("访客");

        private final String description;

        MemberRole(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }
}
