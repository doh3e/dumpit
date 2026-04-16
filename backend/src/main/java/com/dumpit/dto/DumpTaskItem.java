package com.dumpit.dto;

import com.dumpit.entity.Task;

import java.time.LocalDateTime;
import java.util.UUID;

public record DumpTaskItem(
        UUID taskId,
        String title,
        String description,
        Double aiPriorityScore,
        LocalDateTime deadline,
        Integer estimatedMinutes
) {
    public static DumpTaskItem from(Task t) {
        return new DumpTaskItem(
                t.getTaskId(), t.getTitle(), t.getDescription(),
                t.getAiPriorityScore(), t.getDeadline(),
                t.getEstimatedMinutes()
        );
    }
}
