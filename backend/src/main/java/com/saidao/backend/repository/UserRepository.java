package com.saidao.backend.repository;

import com.saidao.backend.entity.User;
import com.saidao.backend.entity.User.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * 用户Repository
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByUsername(String username);
    
    List<User> findByRole(UserRole role);
    
    Page<User> findByRole(UserRole role, Pageable pageable);
    
    boolean existsByUsername(String username);
    
    List<User> findTop10ByUsernameContainingIgnoreCase(String username);
    
    List<User> findByDepartment(String department);
    
    Page<User> findByDepartment(String department, Pageable pageable);
    
    long countByRole(UserRole role);
    
    Page<User> findByNameContainingOrUsernameContaining(String name, String username, Pageable pageable);
}
