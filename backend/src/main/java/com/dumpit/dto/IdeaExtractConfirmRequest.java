package com.dumpit.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record IdeaExtractConfirmRequest(
        @NotEmpty List<@Valid IdeaNodeInput> ideas
) {
    public record IdeaNodeInput(
            @Size(max = 200) String title,
            @Size(max = 5000) String content,
            @Size(max = 50) String category,
            List<@Valid IdeaNodeInput> children
    ) {}
}
