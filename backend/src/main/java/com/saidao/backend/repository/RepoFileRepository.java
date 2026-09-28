package com.saidao.backend.repository;

import com.saidao.backend.entity.RepoFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RepoFileRepository extends JpaRepository<RepoFile, Long> {

    List<RepoFile> findByRepositoryIdAndBranchName(Long repositoryId, String branchName);

    List<RepoFile> findByRepositoryId(Long repositoryId);

    List<RepoFile> findByRepositoryIdAndBranchNameAndFilePathStartingWith(
            Long repositoryId, String branchName, String pathPrefix);

    Optional<RepoFile> findByRepositoryIdAndBranchNameAndFilePath(
            Long repositoryId, String branchName, String filePath);

    boolean existsByRepositoryIdAndBranchNameAndFilePath(
            Long repositoryId, String branchName, String filePath);

    void deleteByRepositoryIdAndBranchNameAndFilePath(
            Long repositoryId, String branchName, String filePath);

    void deleteByRepositoryId(Long repositoryId);
}
