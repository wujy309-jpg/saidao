package com.saidao.backend.dto;

import jakarta.validation.constraints.NotBlank;

/** 选用系统预设头像 */
public record UpdateAvatarPresetRequest(
        @NotBlank(message = "请选择预设头像")
        String presetId
) {}
