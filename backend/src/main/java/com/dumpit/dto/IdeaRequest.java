package com.dumpit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.dumpit.entity.Task;

import java.util.UUID;

public record IdeaRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 5000) String content,
        Boolean pinned,
        Task.Category category,
        UUID parentIdeaId
) {}
