package com.saidao.backend.repository;

import com.saidao.backend.entity.RepoCommitFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepoCommitFileRepository extends JpaRepository<RepoCommitFile, Long> {
    List<RepoCommitFile> findByCommitIdOrderByFilePathAsc(Long commitId);
    void deleteByCommitId(Long commitId);
}
