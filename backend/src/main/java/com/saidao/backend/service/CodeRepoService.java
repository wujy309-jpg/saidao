package com.saidao.backend.service;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.entity.*;
import com.saidao.backend.entity.RepoMember.MemberRole;
import com.saidao.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CodeRepoService {

    private final CodeRepositoryRepository repoRepository;
    private final RepoMemberRepository memberRepository;
    private final RepoBranchRepository branchRepository;
    private final RepoCommitRepository commitRepository;
    private final RepoFileRepository fileRepository;
    private final RepoCommitFileRepository commitFileRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    // ==================== 仓库管理 ====================

    @Transactional
    public CodeRepository createRepository(CodeRepository repo, Long ownerId, Long projectId, Long teamId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        repo.setOwner(owner);
        // Client supplied owner/project fields must never replace the authenticated owner.
        repo.setId(null);
        repo.setMembers(null);
        repo.setBranches(null);
        repo.setDefaultBranch("main");
        repo.setStarCount(0);
        repo.setTeamId(teamId);
        CodeRepository saved = repoRepository.save(repo);

        RepoMember member = new RepoMember();
        member.setRepository(saved);
        member.setUser(owner);
        member.setRole(MemberRole.OWNER);
        memberRepository.save(member);
        audit(ownerId, "CREATE", "CODE_REPOSITORY", saved.getId(), "创建项目空间");

        RepoBranch mainBranch = new RepoBranch();
        mainBranch.setRepository(saved);
        mainBranch.setName("main");
        mainBranch.setIsProtected(true);
        mainBranch.setCreatedBy(owner);
        branchRepository.save(mainBranch);

        log.info("仓库创建成功: {}", saved.getName());
        return saved;
    }

    public List<CodeRepository> getUserRepositories(Long userId) {
        return repoRepository.findByUserId(userId);
    }

    public List<CodeRepository> getAllRepositories() {
        return repoRepository.findAll();
    }

    public CodeRepository getRepository(Long repoId) {
        return repoRepository.findById(repoId)
                .orElseThrow(() -> new RuntimeException("项目空间不存在"));
    }

    public void requireReadAccess(Long repoId, Long userId) {
        if (userId == null || !hasAccess(repoId, userId)) {
            throw new org.springframework.security.access.AccessDeniedException("不是项目空间成员");
        }
    }

    public void requireRole(Long repoId, Long userId, MemberRole... allowed) {
        MemberRole actual = getMemberRole(repoId, userId);
        if (actual == null || java.util.Arrays.stream(allowed).noneMatch(actual::equals)) {
            throw new org.springframework.security.access.AccessDeniedException("没有项目空间权限");
        }
    }

    public void requireWriteAccess(Long repoId, Long userId) {
        requireRole(repoId, userId, MemberRole.OWNER, MemberRole.MAINTAINER, MemberRole.DEVELOPER);
    }

    public void requireManageAccess(Long repoId, Long userId) {
        requireRole(repoId, userId, MemberRole.OWNER, MemberRole.MAINTAINER);
    }

    // ==================== 成员管理 ====================

    @Transactional
    public RepoMember addMember(Long repoId, Long userId, MemberRole role, Long inviterId) {
        CodeRepository repo = getRepository(repoId);
        if (role == null || role == MemberRole.OWNER) {
            throw new IllegalArgumentException("被邀请成员角色无效");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        User inviter = userRepository.findById(inviterId)
                .orElseThrow(() -> new RuntimeException("邀请人不存在"));

        if (memberRepository.existsByRepositoryIdAndUserId(repoId, userId)) {
            throw new RuntimeException("该用户已是项目成员");
        }

        RepoMember member = new RepoMember();
        member.setRepository(repo);
        member.setUser(user);
        member.setRole(role);
        member.setInvitedBy(inviter);
        return memberRepository.save(member);
    }

    @Transactional
    public void removeMember(Long repoId, Long userId) {
        removeMember(repoId, userId, userId);
    }

    @Transactional
    public void removeMember(Long repoId, Long userId, Long actorId) {
        memberRepository.deleteByRepositoryIdAndUserId(repoId, userId);
        audit(actorId, "DELETE", "REPO_MEMBER", repoId, "移出用户" + userId);
    }

    @Transactional
    public RepoMember updateMemberRole(Long repoId, Long userId, MemberRole newRole) {
        return updateMemberRole(repoId, userId, newRole, userId);
    }

    @Transactional
    public RepoMember updateMemberRole(Long repoId, Long userId, MemberRole newRole, Long actorId) {
        RepoMember member = memberRepository.findByRepositoryIdAndUserId(repoId, userId)
                .orElseThrow(() -> new RuntimeException("成员不存在"));
        member.setRole(newRole);
        audit(actorId, "UPDATE", "REPO_MEMBER", repoId, "将用户" + userId + "角色修改为" + newRole.name());
        return memberRepository.save(member);
    }

    public List<RepoMember> getMembers(Long repoId) {
        return memberRepository.findByRepositoryId(repoId);
    }

    public boolean hasAccess(Long repoId, Long userId) {
        return memberRepository.existsByRepositoryIdAndUserId(repoId, userId);
    }

    public MemberRole getMemberRole(Long repoId, Long userId) {
        return memberRepository.findByRepositoryIdAndUserId(repoId, userId)
                .map(RepoMember::getRole)
                .orElse(null);
    }

    // ==================== 分支管理 ====================

    @Transactional
    public RepoBranch createBranch(Long repoId, String branchName, String baseBranch, Long userId) {
        CodeRepository repo = getRepository(repoId);
        requireWriteAccess(repoId, userId);
        validateBranchName(branchName);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        String effectiveBaseBranch = (baseBranch == null || baseBranch.isBlank())
                ? repo.getDefaultBranch() : baseBranch;
        validateBranchName(effectiveBaseBranch);
        if (!branchRepository.existsByRepositoryIdAndName(repoId, effectiveBaseBranch)) {
            throw new IllegalArgumentException("基线分支不存在");
        }

        if (branchRepository.existsByRepositoryIdAndName(repoId, branchName)) {
            throw new RuntimeException("分支已存在");
        }

        RepoBranch branch = new RepoBranch();
        branch.setRepository(repo);
        branch.setName(branchName);
        branch.setCreatedBy(user);
        RepoBranch saved = branchRepository.save(branch);
        audit(userId, "CREATE", "REPO_BRANCH", saved.getId(), "创建分支" + branchName);
        return saved;
    }

    public List<RepoBranch> getBranches(Long repoId) {
        return branchRepository.findByRepositoryId(repoId);
    }

    // ==================== 文件管理 ====================

    @Transactional
    public RepoFile saveFile(Long repoId, String branchName, String filePath,
                             String content, Long userId) {
        CodeRepository repo = getRepository(repoId);
        requireWriteAccess(repoId, userId);
        requireBranch(repoId, branchName);
        String safePath = normalizeRelativePath(filePath);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        Optional<RepoFile> existing = fileRepository
                .findByRepositoryIdAndBranchNameAndFilePath(repoId, branchName, safePath);

        RepoFile file;
        if (existing.isPresent()) {
            file = existing.get();
            file.setContent(content);
            file.setFileSize((long) content.length());
            file.setLastModifiedBy(user);
        } else {
            file = new RepoFile();
            file.setRepository(repo);
            file.setBranchName(branchName);
            file.setFilePath(safePath);
            file.setFileName(extractFileName(safePath));
            file.setContent(content);
            file.setFileSize((long) content.length());
            file.setLastModifiedBy(user);
            file.setFileType(RepoFile.FileType.FILE);
        }
        return fileRepository.save(file);
    }

    public List<RepoFile> getFiles(Long repoId, String branchName, String pathPrefix) {
        requireBranch(repoId, branchName);
        String safePrefix = pathPrefix == null || pathPrefix.isBlank()
                ? null : normalizeRelativePath(pathPrefix);
        if (safePrefix != null) {
            return fileRepository.findByRepositoryIdAndBranchNameAndFilePathStartingWith(
                    repoId, branchName, safePrefix);
        }
        return fileRepository.findByRepositoryIdAndBranchName(repoId, branchName);
    }

    public RepoFile getFile(Long repoId, String branchName, String filePath) {
        requireBranch(repoId, branchName);
        String safePath = normalizeRelativePath(filePath);
        return fileRepository.findByRepositoryIdAndBranchNameAndFilePath(repoId, branchName, safePath)
                .orElseThrow(() -> new RuntimeException("文件不存在"));
    }

    // ==================== 提交管理 ====================

    @Transactional
    public RepoCommit createCommit(Long repoId, Long branchId, String message,
                                    String description, List<CommitFileEntry> files,
                                    Long authorId) {
        CodeRepository repo = getRepository(repoId);
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        RepoBranch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new RuntimeException("分支不存在"));
        if (!branch.getRepository().getId().equals(repoId)) {
            throw new org.springframework.security.access.AccessDeniedException("分支不属于当前项目空间");
        }
        requireWriteAccess(repoId, authorId);

        String hash = generateCommitHash();
        String parentHash = branch.getLatestCommitId();

        int additions = 0;
        int deletions = 0;

        for (CommitFileEntry entry : files) {
            String safePath = normalizeRelativePath(entry.path);
            Optional<RepoFile> existing = fileRepository
                    .findByRepositoryIdAndBranchNameAndFilePath(repoId, branch.getName(), safePath);

            if (entry.deleted) {
                existing.ifPresent(this::deleteStoredFile);
                fileRepository.deleteByRepositoryIdAndBranchNameAndFilePath(
                        repoId, branch.getName(), safePath);
                deletions++;
            } else {
                saveFile(repoId, branch.getName(), safePath, entry.content, authorId);
                if (existing.isPresent()) {
                    additions++;
                    deletions++;
                } else {
                    additions++;
                }
            }
        }

        RepoCommit saved = saveCommitRecord(repo, branch, author, message, description,
                files.size(), additions, deletions);
        audit(authorId, "CREATE", "REPO_COMMIT", saved.getId(), "提交" + saved.getCommitHash());
        for (CommitFileEntry entry : files) {
            fileRepository.findByRepositoryIdAndBranchNameAndFilePath(repoId, branch.getName(),
                    normalizeRelativePath(entry.path)).ifPresent(file -> {
                file.setLastCommitHash(saved.getCommitHash());
                fileRepository.save(file);
            });
        }

        log.info("提交成功: {} on {}", hash.substring(0, 7), branch.getName());
        return saved;
    }

    public List<RepoCommit> getCommits(Long repoId, Long branchId) {
        if (branchId != null) {
            return commitRepository.findByRepositoryIdAndBranchIdOrderByCommittedAtDesc(repoId, branchId);
        }
        return commitRepository.findByRepositoryIdOrderByCommittedAtDesc(repoId);
    }

    public RepoCommit getCommit(Long commitId) {
        return commitRepository.findById(commitId)
                .orElseThrow(() -> new RuntimeException("提交不存在"));
    }

    public List<RepoCommit> searchCommits(Long repoId, String keyword) {
        return commitRepository.search(repoId, keyword);
    }

    public List<RepoCommitFile> getCommitFiles(Long commitId) {
        getCommit(commitId);
        return commitFileRepository.findByCommitIdOrderByFilePathAsc(commitId);
    }

    /** Returns file-level changes between a commit snapshot and its parent snapshot. */
    public List<RepoDiff> diffCommit(Long commitId, String path) {
        RepoCommit commit = getCommit(commitId);
        Map<String, RepoCommitFile> current = commitFileRepository.findByCommitIdOrderByFilePathAsc(commitId)
                .stream().collect(Collectors.toMap(RepoCommitFile::getFilePath, f -> f));
        Map<String, RepoCommitFile> previous = new HashMap<>();
        if (commit.getParentHash() != null) {
            commitRepository.findByCommitHash(commit.getParentHash()).ifPresent(parent ->
                    commitFileRepository.findByCommitIdOrderByFilePathAsc(parent.getId())
                            .forEach(f -> previous.put(f.getFilePath(), f)));
        }
        Set<String> paths = new TreeSet<>();
        paths.addAll(current.keySet());
        paths.addAll(previous.keySet());
        if (path != null && !path.isBlank()) {
            String safe = normalizeRelativePath(path);
            paths.removeIf(p -> !p.equals(safe));
        }
        List<RepoDiff> result = new ArrayList<>();
        for (String filePath : paths) {
            RepoCommitFile before = previous.get(filePath);
            RepoCommitFile after = current.get(filePath);
            boolean binary = (before != null && before.isBinaryFile()) || (after != null && after.isBinaryFile());
            String beforeContent = before == null || binary ? null : before.getContent();
            String afterContent = after == null || binary ? null : after.getContent();
            if (Objects.equals(beforeContent, afterContent) && before != null && after != null && binary == (before.isBinaryFile() && after.isBinaryFile())) {
                continue;
            }
            String type = before == null ? "ADDED" : after == null ? "DELETED" : "MODIFIED";
            result.add(new RepoDiff(filePath, type, beforeContent, afterContent, binary,
                    countAdded(afterContent, beforeContent), countRemoved(beforeContent, afterContent)));
        }
        return result;
    }

    @Transactional
    public RepoCommit rollback(Long repoId, Long commitId, Long userId) {
        RepoCommit target = getCommit(commitId);
        if (target.getRepository() == null || !repoId.equals(target.getRepository().getId())) {
            throw new IllegalArgumentException("提交不属于当前项目空间");
        }
        requireWriteAccess(repoId, userId);
        RepoBranch branch = target.getBranch();
        if (branch == null || !repoId.equals(branch.getRepository().getId())) {
            throw new IllegalArgumentException("提交分支无效");
        }
        User author = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("用户不存在"));
        Map<String, RepoCommitFile> targetFiles = commitFileRepository.findByCommitIdOrderByFilePathAsc(commitId)
                .stream().collect(Collectors.toMap(RepoCommitFile::getFilePath, f -> f));
        if (targetFiles.isEmpty() && (target.getFilesChanged() == null || target.getFilesChanged() > 0)) {
            throw new IllegalStateException("该提交没有可用快照，无法安全回滚");
        }
        List<RepoFile> currentFiles = fileRepository.findByRepositoryIdAndBranchName(repoId, branch.getName());
        int changed = 0;
        int additions = 0;
        int deletions = 0;
        for (RepoFile current : currentFiles) {
            if (!targetFiles.containsKey(current.getFilePath())) {
                deleteStoredFile(current);
                fileRepository.delete(current);
                changed++;
                deletions++;
            }
        }
        for (RepoCommitFile snapshot : targetFiles.values()) {
            RepoFile current = fileRepository.findByRepositoryIdAndBranchNameAndFilePath(
                    repoId, branch.getName(), snapshot.getFilePath()).orElse(null);
            if (snapshot.isBinaryFile()) {
                if (snapshot.getBinaryContent() == null) {
                    throw new IllegalStateException("提交中的二进制文件没有可恢复的快照: " + snapshot.getFilePath());
                }
                Path targetPath = resolveUploadPath(repoId, branch.getName(), snapshot.getFilePath());
                try {
                    Files.createDirectories(targetPath.getParent());
                    Files.write(targetPath, snapshot.getBinaryContent());
                } catch (java.io.IOException e) {
                    throw new RuntimeException("恢复二进制文件失败: " + snapshot.getFilePath(), e);
                }
                uploadFile(repoId, branch.getName(), snapshot.getFilePath(), targetPath.toString(),
                        (long) snapshot.getBinaryContent().length, userId);
            } else {
                saveFile(repoId, branch.getName(), snapshot.getFilePath(), snapshot.getContent() == null ? "" : snapshot.getContent(), userId);
            }
            if (current == null) additions++;
            changed++;
        }
        return saveCommitRecord(target.getRepository(), branch, author,
                "回滚至 " + target.getCommitHash().substring(0, Math.min(8, target.getCommitHash().length())),
                "由系统根据提交快照生成", changed, additions, deletions);
    }

    // ==================== 文件上传（磁盘存储）与仓库删除 ====================

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    public String getUploadDir() {
        return uploadDir;
    }

    public RepoBranch findBranchByName(Long repoId, String branchName) {
        return branchRepository.findByRepositoryIdAndName(repoId, branchName).orElse(null);
    }

    /**
     * 保存上传文件记录（二进制文件存磁盘，storagePath 指向磁盘路径）
     */
    @Transactional
    public RepoFile uploadFile(Long repoId, String branchName, String filePath,
                               String storagePath, Long fileSize, Long userId) {
        CodeRepository repo = getRepository(repoId);
        requireWriteAccess(repoId, userId);
        requireBranch(repoId, branchName);
        String safePath = normalizeRelativePath(filePath);
        Path expectedStoragePath = resolveUploadPath(repoId, branchName, safePath);
        if (!Paths.get(storagePath).toAbsolutePath().normalize().equals(expectedStoragePath)) {
            throw new IllegalArgumentException("文件存储路径非法");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        Optional<RepoFile> existing = fileRepository
                .findByRepositoryIdAndBranchNameAndFilePath(repoId, branchName, safePath);

        RepoFile file;
        if (existing.isPresent()) {
            file = existing.get();
            file.setStoragePath(storagePath);
            file.setContent(null);
            file.setFileSize(fileSize);
            file.setLastModifiedBy(user);
        } else {
            file = new RepoFile();
            file.setRepository(repo);
            file.setBranchName(branchName);
            file.setFilePath(safePath);
            file.setFileName(extractFileName(safePath));
            file.setStoragePath(storagePath);
            file.setFileSize(fileSize);
            file.setLastModifiedBy(user);
            file.setFileType(RepoFile.FileType.FILE);
        }
        return fileRepository.save(file);
    }

    /**
     * 删除仓库（连同成员/分支/文件/提交与磁盘文件）
     */
    @Transactional
    public void deleteRepository(Long repoId) {
        deleteRepository(repoId, null);
    }

    @Transactional
    public void deleteRepository(Long repoId, Long actorId) {
        getRepository(repoId);
        List<RepoFile> files = fileRepository.findByRepositoryId(repoId);
        for (RepoFile f : files) {
            if (f.getStoragePath() != null && !f.getStoragePath().isBlank()) {
                try {
                    Files.deleteIfExists(Paths.get(f.getStoragePath()));
                } catch (Exception ignored) {
                    log.warn("清理磁盘文件失败: {}", f.getStoragePath());
                }
            }
        }
        fileRepository.deleteByRepositoryId(repoId);
        commitRepository.findByRepositoryIdOrderByCommittedAtDesc(repoId)
                .forEach(commit -> commitFileRepository.deleteByCommitId(commit.getId()));
        commitRepository.deleteByRepositoryId(repoId);
        branchRepository.deleteByRepositoryId(repoId);
        memberRepository.deleteByRepositoryId(repoId);
        repoRepository.deleteById(repoId);
        if (actorId != null) {
            audit(actorId, "DELETE", "CODE_REPOSITORY", repoId, "删除项目空间");
        }
        log.info("仓库已删除: {}", repoId);
    }

    // ==================== 工具方法 ====================

    private String generateCommitHash() {
        return UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private String extractFileName(String filePath) {
        int lastSlash = filePath.lastIndexOf('/');
        return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
    }

    public void validateBranchName(String branchName) {
        if (branchName == null || !branchName.matches("^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$")) {
            throw new IllegalArgumentException("分支名只能包含字母、数字、点、下划线和短横线，长度为 1-50");
        }
    }

    public String normalizeRelativePath(String filePath) {
        if (filePath == null || filePath.isBlank() || filePath.indexOf('\0') >= 0) {
            throw new IllegalArgumentException("文件路径不能为空");
        }
        String normalizedSeparators = filePath.trim().replace('\\', '/');
        Path normalized = Paths.get(normalizedSeparators).normalize();
        if (normalized.isAbsolute() || normalized.startsWith("..") || normalizedSeparators.startsWith("/")) {
            throw new IllegalArgumentException("非法文件路径");
        }
        String safePath = normalized.toString().replace('\\', '/');
        if (safePath.isBlank() || safePath.equals(".")) {
            throw new IllegalArgumentException("非法文件路径");
        }
        return safePath;
    }

    public Path resolveUploadPath(Long repoId, String branchName, String filePath) {
        requireBranch(repoId, branchName);
        String safePath = normalizeRelativePath(filePath);
        Path base = Paths.get(uploadDir, "repos", String.valueOf(repoId), branchName)
                .toAbsolutePath().normalize();
        Path target = base.resolve(safePath).normalize();
        if (!target.startsWith(base)) {
            throw new IllegalArgumentException("非法文件路径");
        }
        return target;
    }

    private RepoBranch requireBranch(Long repoId, String branchName) {
        validateBranchName(branchName);
        return branchRepository.findByRepositoryIdAndName(repoId, branchName)
                .orElseThrow(() -> new IllegalArgumentException("分支不存在"));
    }

    private RepoCommit saveCommitRecord(CodeRepository repo, RepoBranch branch, User author,
                                        String message, String description, int filesChanged,
                                        int additions, int deletions) {
        RepoCommit commit = new RepoCommit();
        commit.setCommitHash(generateCommitHash());
        commit.setRepository(repo);
        commit.setBranch(branch);
        commit.setMessage(message == null || message.isBlank() ? "未命名提交" : message.trim());
        commit.setDescription(description);
        commit.setAuthor(author);
        commit.setParentHash(branch.getLatestCommitId());
        commit.setFilesChanged(filesChanged);
        commit.setAdditions(additions);
        commit.setDeletions(deletions);
        RepoCommit saved = commitRepository.save(commit);
        branch.setLatestCommitId(saved.getCommitHash());
        branchRepository.save(branch);
        captureSnapshot(saved, branch);
        return saved;
    }

    private void captureSnapshot(RepoCommit commit, RepoBranch branch) {
        for (RepoFile file : fileRepository.findByRepositoryIdAndBranchName(branch.getRepository().getId(), branch.getName())) {
            RepoCommitFile snapshot = new RepoCommitFile();
            snapshot.setCommit(commit);
            snapshot.setFilePath(file.getFilePath());
            snapshot.setFileSize(file.getFileSize());
            boolean binary = file.getStoragePath() != null;
            snapshot.setBinaryFile(binary);
            if (binary) {
                try {
                    snapshot.setBinaryContent(Files.readAllBytes(Paths.get(file.getStoragePath())));
                } catch (Exception e) {
                    log.warn("无法读取二进制快照 {}: {}", file.getFilePath(), e.getMessage());
                }
            } else {
                snapshot.setContent(file.getContent());
            }
            commitFileRepository.save(snapshot);
        }
    }

    private void deleteStoredFile(RepoFile file) {
        if (file.getStoragePath() != null && !file.getStoragePath().isBlank()) {
            try { Files.deleteIfExists(Paths.get(file.getStoragePath())); }
            catch (Exception e) { log.warn("清理文件失败: {}", file.getStoragePath()); }
        }
    }

    private void audit(Long userId, String action, String resourceType, Long resourceId, String details) {
        userRepository.findById(userId).ifPresent(user -> auditService.logAction(userId, user.getUsername(),
                action, resourceType, resourceId, details, true, null));
    }

    private int countAdded(String after, String before) {
        if (after == null) return 0;
        if (before == null) return after.split("\\R", -1).length;
        return Math.max(0, after.split("\\R", -1).length - before.split("\\R", -1).length);
    }

    private int countRemoved(String before, String after) {
        if (before == null) return 0;
        if (after == null) return before.split("\\R", -1).length;
        return Math.max(0, before.split("\\R", -1).length - after.split("\\R", -1).length);
    }

    public record RepoDiff(String filePath, String changeType, String beforeContent, String afterContent,
                            boolean binary, int additions, int deletions) {}

    // ==================== 内部类 ====================

    public static class CommitFileEntry {
        public String path;
        public String content;
        public boolean deleted;
    }
}
