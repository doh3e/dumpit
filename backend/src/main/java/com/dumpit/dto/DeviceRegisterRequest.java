package com.dumpit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeviceRegisterRequest(
        @NotBlank @Size(max = 4096) String token,
        String platform
) {
    public String platformOrDefault() {
        return platform == null || platform.isBlank() ? "android" : platform;
    }
}
