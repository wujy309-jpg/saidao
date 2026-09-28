package com.saidao.backend.dto;

import com.saidao.backend.entity.TokenAccount;
import com.saidao.backend.entity.User;

/**
 * 后台用户余额视图
 */
public record UserBalanceView(
        Long userId,
        String username,
        String name,
        String role,
        String email,
        String department,
        Long balance,
        Long totalRecharged,
        Long totalConsumed,
        Long totalGranted
) {
    public static UserBalanceView of(User user, TokenAccount account) {
        return new UserBalanceView(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getRole() == null ? null : user.getRole().name(),
                user.getEmail(),
                user.getDepartment(),
                account == null ? 0L : account.getBalance(),
                account == null ? 0L : account.getTotalRecharged(),
                account == null ? 0L : account.getTotalConsumed(),
                account == null ? 0L : account.getTotalGranted()
        );
    }
}
