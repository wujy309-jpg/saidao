package com.saidao.backend.repository;

import com.saidao.backend.entity.BillingSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingSettingRepository extends JpaRepository<BillingSetting, Long> {
}
