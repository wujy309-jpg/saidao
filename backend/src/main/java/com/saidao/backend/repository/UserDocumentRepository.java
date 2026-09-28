package com.saidao.backend.repository;

import com.saidao.backend.entity.UserDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserDocumentRepository extends JpaRepository<UserDocument, Long> {

    List<UserDocument> findByUserIdAndCompetitionIdOrderByCreatedAtDesc(Long userId, Long competitionId);

    long countByUserIdAndCompetitionId(Long userId, Long competitionId);
}
