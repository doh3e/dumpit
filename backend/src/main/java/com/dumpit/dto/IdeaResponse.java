package com.dumpit.dto;

import com.dumpit.entity.Idea;

import java.time.LocalDateTime;
import java.util.UUID;

public record IdeaResponse(
        UUID ideaId,
        String title,
        String content,
        Boolean pinned,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static IdeaResponse from(Idea idea) {
        return new IdeaResponse(
                idea.getIdeaId(),
                idea.getTitle(),
                idea.getContent(),
                idea.getPinned(),
                idea.getCreatedAt(),
                idea.getUpdatedAt()
        );
    }
}
