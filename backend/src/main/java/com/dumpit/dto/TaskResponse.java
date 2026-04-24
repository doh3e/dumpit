package com.dumpit.dto;

import com.dumpit.entity.Task;

import java.time.LocalDateTime;
import java.util.UUID;

public record TaskResponse(
        UUID taskId,
        UUID parentTaskId,
        String title,
        String description,
        String status,
        String category,
        Double aiPriorityScore,
        Double userPriorityScore,
        Double effectivePriority,
        LocalDateTime deadline,
        Integer estimatedMinutes,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Boolean isLocked,
        String syncSource,
        LocalDateTime createdAt
) {
    public static TaskResponse from(Task t) {
        return new TaskResponse(
                t.getTaskId(),
                t.getParentTask() != null ? t.getParentTask().getTaskId() : null,
                t.getTitle(), t.getDescription(),
                t.getStatus().name(),
                t.getCategory() != null ? t.getCategory().name() : Task.Category.OTHER.name(),
                t.getAiPriorityScore(), t.getUserPriorityScore(),
                t.getEffectivePriority(),
                t.getDeadline(), t.getEstimatedMinutes(),
                t.getStartTime(), t.getEndTime(),
                t.getIsLocked(), t.getSyncSource().name(),
                t.getCreatedAt()
        );
    }
}
