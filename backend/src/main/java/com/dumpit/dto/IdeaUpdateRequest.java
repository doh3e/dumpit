package com.dumpit.dto;

import jakarta.validation.constraints.Size;

import com.dumpit.entity.Task;

import java.util.UUID;

public record IdeaUpdateRequest(
        @Size(max = 200) String title,
        @Size(max = 3000) String content,
        Boolean pinned,
        Task.Category category,
        UUID parentIdeaId
) {}
