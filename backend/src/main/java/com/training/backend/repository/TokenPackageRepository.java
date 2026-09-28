package com.training.backend.repository;

import com.training.backend.entity.TokenPackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TokenPackageRepository extends JpaRepository<TokenPackage, Long> {

    List<TokenPackage> findByEnabledTrueOrderBySortOrderAscIdAsc();

    List<TokenPackage> findAllByOrderBySortOrderAscIdAsc();
}
