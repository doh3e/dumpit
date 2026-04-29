package com.dumpit.dto;

import com.dumpit.entity.Task;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record TaskRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 1000) String description,
        LocalDateTime deadline,
        Integer estimatedMinutes,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Boolean isLocked,
        Task.Category category
) {}
