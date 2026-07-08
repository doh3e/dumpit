package com.dumpit.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IdeaExtractConfirmRequest(
        @NotNull List<IdeaNodeInput> ideas
) {
    public record IdeaNodeInput(
            String title,
            String content,
            String category,
            List<IdeaNodeInput> children
    ) {}
}
