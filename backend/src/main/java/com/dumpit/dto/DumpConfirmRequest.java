package com.dumpit.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDateTime;
import java.util.List;

public record DumpConfirmRequest(@NotEmpty List<@Valid TaskInput> tasks) {

    public record TaskInput(
            String title,
            String description,
            Double priorityScore,
            String category,
            LocalDateTime deadline,
            Integer estimatedMinutes
    ) {}
}
