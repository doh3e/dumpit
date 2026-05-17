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
        Integer monthlyWeekOrdinal,
        Integer monthlyWeekDay,
        Boolean runOnLastDayIfMissing,
        LocalTime createTime,
        LocalTime routineStartTime,
        LocalTime routineEndTime,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate lastGeneratedDate,
        LocalDateTime nextRunAt,
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
                routine.getMonthlyWeekOrdinal(),
                routine.getMonthlyWeekDay(),
                routine.getRunOnLastDayIfMissing(),
                routine.getCreateTime(),
                routine.getRoutineStartTime() != null ? routine.getRoutineStartTime() : routine.getCreateTime(),
                routine.getRoutineEndTime(),
                routine.getStartDate(),
                routine.getEndDate(),
                routine.getLastGeneratedDate(),
                routine.getNextRunAt(),
                routine.getCreatedAt(),
                routine.getUpdatedAt()
        );
    }
}
