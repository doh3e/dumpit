package com.dumpit.dto;

import jakarta.validation.constraints.Size;

public record IdeaUpdateRequest(
        @Size(max = 200) String title,
        @Size(max = 5000) String content,
        Boolean pinned
) {}
