package com.saidao.backend.repository;

import com.saidao.backend.entity.TokenPackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TokenPackageRepository extends JpaRepository<TokenPackage, Long> {

    List<TokenPackage> findByEnabledTrueOrderBySortOrderAscIdAsc();

    List<TokenPackage> findAllByOrderBySortOrderAscIdAsc();
}
