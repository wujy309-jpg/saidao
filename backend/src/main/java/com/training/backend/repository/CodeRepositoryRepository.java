package com.training.backend.repository;

import com.training.backend.entity.CodeRepository;
import com.training.backend.entity.CodeRepository.Visibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CodeRepositoryRepository extends JpaRepository<CodeRepository, Long> {

    List<CodeRepository> findByOwnerId(Long ownerId);

    List<CodeRepository> findByProjectId(Long projectId);

    List<CodeRepository> findByVisibility(Visibility visibility);

    List<CodeRepository> findByTeamId(Long teamId);

    @Query("SELECT r FROM CodeRepository r WHERE r.owner.id = :userId OR r.id IN " +
           "(SELECT m.repository.id FROM RepoMember m WHERE m.user.id = :userId)")
    List<CodeRepository> findByUserId(@Param("userId") Long userId);

    @Query("SELECT r FROM CodeRepository r WHERE r.name LIKE %:keyword% OR r.description LIKE %:keyword%")
    List<CodeRepository> search(@Param("keyword") String keyword);
}
