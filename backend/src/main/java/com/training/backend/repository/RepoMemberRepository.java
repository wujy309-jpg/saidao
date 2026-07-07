package com.training.backend.repository;

import com.training.backend.entity.RepoMember;
import com.training.backend.entity.RepoMember.MemberRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RepoMemberRepository extends JpaRepository<RepoMember, Long> {

    List<RepoMember> findByRepositoryId(Long repositoryId);

    Optional<RepoMember> findByRepositoryIdAndUserId(Long repositoryId, Long userId);

    boolean existsByRepositoryIdAndUserId(Long repositoryId, Long userId);

    List<RepoMember> findByRepositoryIdAndRole(Long repositoryId, MemberRole role);

    void deleteByRepositoryIdAndUserId(Long repositoryId, Long userId);
}
