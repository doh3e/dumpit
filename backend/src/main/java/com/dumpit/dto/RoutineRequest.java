package com.dumpit.dto;

import com.dumpit.entity.Routine;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

public record RoutineRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 1000) String description,
        Boolean enabled,
        @NotNull Routine.RepeatType repeatType,
        Set<Integer> daysOfWeek,
        Set<Integer> daysOfMonth,
        LocalTime createTime,
        @NotNull LocalDate startDate,
        LocalDate endDate
) {}
