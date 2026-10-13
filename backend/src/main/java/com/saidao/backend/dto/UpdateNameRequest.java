package com.saidao.backend.dto;

import jakarta.validation.constraints.NotBlank;

/** 修改展示昵称 */
public record UpdateNameRequest(
        @NotBlank(message = "昵称不能为空")
        String name
) {}
