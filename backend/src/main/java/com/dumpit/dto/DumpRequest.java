package com.dumpit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DumpRequest(
        @NotBlank @Size(max = 5000) String rawText
) {}
