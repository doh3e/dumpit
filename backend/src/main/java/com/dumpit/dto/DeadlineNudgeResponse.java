package com.dumpit.dto;

import com.dumpit.entity.Task;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

public record DeadlineNudgeResponse(
        UUID taskId,
        String title,
        LocalDateTime deadline,
        long remainingMinutes,
        boolean overdue
) {
    public static DeadlineNudgeResponse from(Task task, LocalDateTime now) {
        long remainingMinutes = Duration.between(now, task.getDeadline()).toMinutes();
        return new DeadlineNudgeResponse(
                task.getTaskId(),
                task.getTitle(),
                task.getDeadline(),
                remainingMinutes,
                remainingMinutes < 0
        );
    }
}
