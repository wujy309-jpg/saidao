package com.saidao.backend.repository;

import com.saidao.backend.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    
    Optional<UserProfile> findByUserId(Long userId);
    
    List<UserProfile> findByUserIdIn(List<Long> userIds);
}
