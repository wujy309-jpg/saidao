package com.saidao.backend.dto;

import com.saidao.backend.entity.CodeRepository;
import com.saidao.backend.entity.RepoBranch;
import com.saidao.backend.entity.RepoCommit;
import com.saidao.backend.entity.RepoFile;
import com.saidao.backend.entity.RepoMember;
import com.saidao.backend.entity.RepoCommitFile;

import java.time.LocalDateTime;

/** Public response shapes for project-space APIs. */
public final class RepoDtos {
    private RepoDtos() {
    }

    public record RepositoryView(
            Long id,
            String name,
            String description,
            Long projectId,
            Long teamId,
            UserBrief owner,
            String defaultBranch,
            String visibility,
            String language,
            Integer starCount,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        public static RepositoryView from(CodeRepository repo) {
            return new RepositoryView(repo.getId(), repo.getName(), repo.getDescription(),
                    repo.getProjectId(), repo.getTeamId(), UserBrief.from(repo.getOwner()),
                    repo.getDefaultBranch(), repo.getVisibility() == null ? null : repo.getVisibility().name(),
                    repo.getLanguage(), repo.getStarCount(), repo.getCreatedAt(), repo.getUpdatedAt());
        }
    }

    public record MemberView(Long id, UserBrief user, String role, LocalDateTime createdAt) {
        public static MemberView from(RepoMember member) {
            return new MemberView(member.getId(), UserBrief.from(member.getUser()),
                    member.getRole() == null ? null : member.getRole().name(), member.getCreatedAt());
        }
    }

    public record BranchView(Long id, String name, String latestCommitId, Boolean isProtected,
                             UserBrief createdBy, LocalDateTime createdAt) {
        public static BranchView from(RepoBranch branch) {
            return new BranchView(branch.getId(), branch.getName(), branch.getLatestCommitId(),
                    branch.getIsProtected(), UserBrief.from(branch.getCreatedBy()), branch.getCreatedAt());
        }
    }

    public record FileView(Long id, String branchName, String filePath, String fileName, String content,
                           Boolean binary, String fileType, Long fileSize, String lastCommitHash,
                           UserBrief lastModifiedBy, LocalDateTime lastModifiedAt, LocalDateTime createdAt) {
        public static FileView from(RepoFile file) {
            return new FileView(file.getId(), file.getBranchName(), file.getFilePath(), file.getFileName(),
                    file.getContent(), file.getStoragePath() != null, file.getFileType() == null ? null : file.getFileType().name(),
                    file.getFileSize(), file.getLastCommitHash(), UserBrief.from(file.getLastModifiedBy()),
                    file.getLastModifiedAt(), file.getCreatedAt());
        }
    }

    public record CommitView(Long id, String commitHash, Long repositoryId, Long branchId, String message,
                             String description, UserBrief author, String parentHash, Integer filesChanged,
                             Integer additions, Integer deletions, LocalDateTime committedAt) {
        public static CommitView from(RepoCommit commit) {
            return new CommitView(commit.getId(), commit.getCommitHash(),
                    commit.getRepository() == null ? null : commit.getRepository().getId(),
                    commit.getBranch() == null ? null : commit.getBranch().getId(), commit.getMessage(),
                    commit.getDescription(), UserBrief.from(commit.getAuthor()), commit.getParentHash(),
                    commit.getFilesChanged(), commit.getAdditions(), commit.getDeletions(), commit.getCommittedAt());
        }
    }

    public record CommitFileView(Long id, Long commitId, String filePath, String content,
                                 Boolean binary, Long fileSize, LocalDateTime capturedAt) {
        public static CommitFileView from(RepoCommitFile file) {
            return new CommitFileView(file.getId(), file.getCommit() == null ? null : file.getCommit().getId(),
                    file.getFilePath(), file.getContent(), file.isBinaryFile(), file.getFileSize(), file.getCapturedAt());
        }
    }

    public record DiffView(String filePath, String changeType, String beforeContent, String afterContent,
                           Boolean binary, Integer additions, Integer deletions) {}
}
