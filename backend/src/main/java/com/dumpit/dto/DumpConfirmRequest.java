package com.dumpit.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public record DumpConfirmRequest(@NotEmpty List<@Valid TaskInput> tasks) {

    public record TaskInput(
            @Size(max = 200) String title,
            @Size(max = 1000) String description,
            Double priorityScore,
            @Size(max = 50) String category,
            LocalDateTime deadline,
            Integer estimatedMinutes
    ) {}
}
