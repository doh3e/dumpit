package com.dumpit.dto;

import com.dumpit.entity.Routine;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;
import java.util.UUID;

public record RoutineResponse(
        UUID routineId,
        String name,
        String description,
        Boolean enabled,
        String repeatType,
        Set<Integer> daysOfWeek,
        Set<Integer> daysOfMonth,
        LocalTime createTime,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate lastGeneratedDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static RoutineResponse from(Routine routine) {
        return new RoutineResponse(
                routine.getRoutineId(),
                routine.getName(),
                routine.getDescription(),
                routine.getEnabled(),
                routine.getRepeatType().name(),
                routine.dayOfWeekSet(),
                routine.dayOfMonthSet(),
                routine.getCreateTime(),
                routine.getStartDate(),
                routine.getEndDate(),
                routine.getLastGeneratedDate(),
                routine.getCreatedAt(),
                routine.getUpdatedAt()
        );
    }
}
