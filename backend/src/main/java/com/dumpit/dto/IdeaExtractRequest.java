package com.dumpit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record IdeaExtractRequest(
        @NotBlank @Size(max = 2000) String rawText
) {}
