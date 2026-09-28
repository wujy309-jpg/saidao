package com.training.backend.repository;

import com.training.backend.entity.BillingSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingSettingRepository extends JpaRepository<BillingSetting, Long> {
}
