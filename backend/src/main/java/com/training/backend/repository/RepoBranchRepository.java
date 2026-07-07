package com.training.backend.repository;

import com.training.backend.entity.RepoBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RepoBranchRepository extends JpaRepository<RepoBranch, Long> {

    List<RepoBranch> findByRepositoryId(Long repositoryId);

    Optional<RepoBranch> findByRepositoryIdAndName(Long repositoryId, String name);

    boolean existsByRepositoryIdAndName(Long repositoryId, String name);
}
