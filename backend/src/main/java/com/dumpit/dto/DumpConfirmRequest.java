package com.dumpit.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DumpConfirmRequest(List<TaskInput> tasks) {

    public record TaskInput(
            String title,
            String description,
            Double priorityScore,
            String category,
            LocalDateTime deadline,
            Integer estimatedMinutes
    ) {}
}
