package com.dumpit.dto;

import com.dumpit.entity.Idea;

import java.time.LocalDateTime;
import java.util.UUID;

public record IdeaResponse(
        UUID ideaId,
        UUID parentIdeaId,
        UUID convertedTaskId,
        String title,
        String content,
        String category,
        Boolean pinned,
        LocalDateTime convertedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static IdeaResponse from(Idea idea) {
        return new IdeaResponse(
                idea.getIdeaId(),
                idea.getParentIdea() != null ? idea.getParentIdea().getIdeaId() : null,
                idea.getConvertedTask() != null ? idea.getConvertedTask().getTaskId() : null,
                idea.getTitle(),
                idea.getContent(),
                idea.getCategory().name(),
                idea.getPinned(),
                idea.getConvertedAt(),
                idea.getCreatedAt(),
                idea.getUpdatedAt()
        );
    }
}
