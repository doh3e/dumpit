package com.dumpit.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TaskPlanningResponse(
        LocalDateTime now,
        Integer availableFocusMinutes,
        List<TaskResponse> tasks,
        NowSuggestionResponse nowSuggestion,
        List<TaskRecommendationResponse> focusRecommendations,
        TaskPlanningSections sections,
        List<TaskResponse> timedTasks
) {
    public record TaskRecommendationResponse(
            TaskResponse task,
            int score,
            String bucket,
            List<String> reasons
    ) {}

    public record NowSuggestionResponse(
            String type,
            String title,
            String message,
            TaskResponse task,
            Integer focusMinutes
    ) {}

    public record TaskPlanningSections(
            List<TaskResponse> today,
            List<TaskResponse> next3Days,
            List<TaskResponse> next7Days,
            List<TaskResponse> later,
            List<TaskResponse> overdue,
            List<TaskResponse> recentDone
    ) {}
}
