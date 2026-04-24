package com.dumpit.dto;

import com.dumpit.entity.Task;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record TaskUpdateRequest(
        @Size(max = 200) String title,
        @Size(max = 2000) String description,
        String status,
        Double userPriorityScore,
        LocalDateTime deadline,
        Integer estimatedMinutes,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Boolean isLocked,
        Task.Category category
) {}
