package com.training.backend.service;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.*;
import com.training.backend.entity.RepoMember.MemberRole;
import com.training.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final UserRepository userRepository;

    // ==================== 仓库管理 ====================

    @Transactional
    public CodeRepository createRepository(CodeRepository repo, Long ownerId, Long projectId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        repo.setOwner(owner);
        repo.setDefaultBranch("main");
        repo.setStarCount(0);
        CodeRepository saved = repoRepository.save(repo);

        RepoMember member = new RepoMember();
        member.setRepository(saved);
        member.setUser(owner);
        member.setRole(MemberRole.OWNER);
        memberRepository.save(member);

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
                .orElseThrow(() -> new RuntimeException("仓库不存在"));
    }

    // ==================== 成员管理 ====================

    @Transactional
    public RepoMember addMember(Long repoId, Long userId, MemberRole role, Long inviterId) {
        CodeRepository repo = getRepository(repoId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        User inviter = userRepository.findById(inviterId)
                .orElseThrow(() -> new RuntimeException("邀请人不存在"));

        if (memberRepository.existsByRepositoryIdAndUserId(repoId, userId)) {
            throw new RuntimeException("该用户已是仓库成员");
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
        memberRepository.deleteByRepositoryIdAndUserId(repoId, userId);
    }

    @Transactional
    public RepoMember updateMemberRole(Long repoId, Long userId, MemberRole newRole) {
        RepoMember member = memberRepository.findByRepositoryIdAndUserId(repoId, userId)
                .orElseThrow(() -> new RuntimeException("成员不存在"));
        member.setRole(newRole);
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        if (branchRepository.existsByRepositoryIdAndName(repoId, branchName)) {
            throw new RuntimeException("分支已存在");
        }

        RepoBranch branch = new RepoBranch();
        branch.setRepository(repo);
        branch.setName(branchName);
        branch.setCreatedBy(user);
        return branchRepository.save(branch);
    }

    public List<RepoBranch> getBranches(Long repoId) {
        return branchRepository.findByRepositoryId(repoId);
    }

    // ==================== 文件管理 ====================

    @Transactional
    public RepoFile saveFile(Long repoId, String branchName, String filePath,
                             String content, Long userId) {
        CodeRepository repo = getRepository(repoId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        Optional<RepoFile> existing = fileRepository
                .findByRepositoryIdAndBranchNameAndFilePath(repoId, branchName, filePath);

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
            file.setFilePath(filePath);
            file.setFileName(extractFileName(filePath));
            file.setContent(content);
            file.setFileSize((long) content.length());
            file.setLastModifiedBy(user);
            file.setFileType(RepoFile.FileType.FILE);
        }
        return fileRepository.save(file);
    }

    public List<RepoFile> getFiles(Long repoId, String branchName, String pathPrefix) {
        if (pathPrefix != null && !pathPrefix.isEmpty()) {
            return fileRepository.findByRepositoryIdAndBranchNameAndFilePathStartingWith(
                    repoId, branchName, pathPrefix);
        }
        return fileRepository.findByRepositoryIdAndBranchName(repoId, branchName);
    }

    public RepoFile getFile(Long repoId, String branchName, String filePath) {
        return fileRepository.findByRepositoryIdAndBranchNameAndFilePath(repoId, branchName, filePath)
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

        String hash = generateCommitHash();
        String parentHash = branch.getLatestCommitId();

        int additions = 0;
        int deletions = 0;

        for (CommitFileEntry entry : files) {
            Optional<RepoFile> existing = fileRepository
                    .findByRepositoryIdAndBranchNameAndFilePath(repoId, branch.getName(), entry.path);

            if (entry.deleted) {
                fileRepository.deleteByRepositoryIdAndBranchNameAndFilePath(
                        repoId, branch.getName(), entry.path);
                deletions++;
            } else {
                saveFile(repoId, branch.getName(), entry.path, entry.content, authorId);
                if (existing.isPresent()) {
                    additions++;
                    deletions++;
                } else {
                    additions++;
                }
            }
        }

        RepoCommit commit = new RepoCommit();
        commit.setCommitHash(hash);
        commit.setRepository(repo);
        commit.setBranch(branch);
        commit.setMessage(message);
        commit.setDescription(description);
        commit.setAuthor(author);
        commit.setParentHash(parentHash);
        commit.setFilesChanged(files.size());
        commit.setAdditions(additions);
        commit.setDeletions(deletions);
        RepoCommit saved = commitRepository.save(commit);

        branch.setLatestCommitId(hash);
        branchRepository.save(branch);

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

    // ==================== 工具方法 ====================

    private String generateCommitHash() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 40);
    }

    private String extractFileName(String filePath) {
        int lastSlash = filePath.lastIndexOf('/');
        return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
    }

    // ==================== 内部类 ====================

    public static class CommitFileEntry {
        public String path;
        public String content;
        public boolean deleted;
    }
}
