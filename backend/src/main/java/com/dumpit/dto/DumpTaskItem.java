package com.dumpit.dto;

import com.dumpit.entity.Task;

import java.time.LocalDateTime;
import java.util.UUID;

public record DumpTaskItem(
        UUID taskId,
        String title,
        String description,
        Double aiPriorityScore,
        String category,
        LocalDateTime deadline,
        Integer estimatedMinutes
) {
    public static DumpTaskItem from(Task t) {
        return new DumpTaskItem(
                t.getTaskId(), t.getTitle(), t.getDescription(),
                t.getAiPriorityScore(), t.getCategory().name(),
                t.getDeadline(), t.getEstimatedMinutes()
        );
    }

    public static DumpTaskItem fromProposal(com.dumpit.service.OpenAiService.BrainDumpTask ai) {
        return new DumpTaskItem(
                null, ai.title(), ai.description(),
                ai.priorityScore(), ai.category(),
                parseDeadline(ai.deadline()), ai.estimatedMinutes()
        );
    }

    private static LocalDateTime parseDeadline(String s) {
        if (s == null || s.isBlank() || "null".equals(s)) return null;
        try {
            return LocalDateTime.parse(s, java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            return null;
        }
    }
}
