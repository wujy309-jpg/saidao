package com.training.backend.repository;

import com.training.backend.entity.RepoCommit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RepoCommitRepository extends JpaRepository<RepoCommit, Long> {

    List<RepoCommit> findByRepositoryIdOrderByCommittedAtDesc(Long repositoryId);

    List<RepoCommit> findByRepositoryIdAndBranchIdOrderByCommittedAtDesc(Long repositoryId, Long branchId);

    Optional<RepoCommit> findByCommitHash(String commitHash);

    List<RepoCommit> findByAuthorIdOrderByCommittedAtDesc(Long authorId);

    @Query("SELECT c FROM RepoCommit c WHERE c.repository.id = :repoId AND " +
           "(c.message LIKE %:keyword% OR c.description LIKE %:keyword%) ORDER BY c.committedAt DESC")
    List<RepoCommit> search(@Param("repoId") Long repoId, @Param("keyword") String keyword);

    @Query("SELECT COUNT(c) FROM RepoCommit c WHERE c.repository.id = :repoId")
    long countByRepositoryId(@Param("repoId") Long repoId);
}
