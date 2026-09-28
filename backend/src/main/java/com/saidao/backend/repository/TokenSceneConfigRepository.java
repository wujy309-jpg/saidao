package com.saidao.backend.repository;

import com.saidao.backend.entity.TokenSceneConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TokenSceneConfigRepository extends JpaRepository<TokenSceneConfig, Long> {

    Optional<TokenSceneConfig> findByScene(String scene);

    List<TokenSceneConfig> findAllByOrderBySortOrderAscIdAsc();
}
