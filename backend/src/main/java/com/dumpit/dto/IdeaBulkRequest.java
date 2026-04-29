package com.dumpit.dto;

import com.dumpit.entity.Task;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record IdeaBulkRequest(
        @NotBlank @Size(max = 3000) String rawText,
        Task.Category category,
        UUID parentIdeaId
) {}
