package com.dumpit.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record IdeaExtractConfirmRequest(
        @NotEmpty List<IdeaNodeInput> ideas
) {
    public record IdeaNodeInput(
            String title,
            String content,
            String category,
            List<IdeaNodeInput> children
    ) {}
}
