package com.dumpit.service.impl;

import com.dumpit.dto.TaskPlanningResponse;
import com.dumpit.dto.TaskResponse;
import com.dumpit.entity.Task;
import com.dumpit.service.TaskPlanningService;
import com.dumpit.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskPlanningServiceImpl implements TaskPlanningService {

    private static final int RECENT_DONE_DAYS = 3;
    private static final int DEFAULT_FOCUS_MINUTES = 25;
    private static final int MAX_RECOMMENDATIONS = 3;

    private final TaskService taskService;

    @Override
    @Transactional(readOnly = true)
    public TaskPlanningResponse getPlanning(String email) {
        LocalDateTime now = LocalDateTime.now();
        List<Task> tasks = taskService.getTasksForUser(email, RECENT_DONE_DAYS);
        int availableFocusMinutes = availableFocusMinutes(tasks, now);

        List<Task> active = tasks.stream()
                .filter(this::isActive)
                .toList();

        List<TaskRecommendation> recommendations = active.stream()
                .filter((task) -> isRecommendationCandidate(task, now))
                .map((task) -> recommend(task, now, availableFocusMinutes))
                .filter((recommendation) -> recommendation.score() > 0)
                .sorted(Comparator.comparingInt(TaskRecommendation::score).reversed()
                        .thenComparing((r) -> deadlineSortValue(r.task())))
                .limit(MAX_RECOMMENDATIONS)
                .toList();

        TaskPlanningResponse.TaskPlanningSections sections = new TaskPlanningResponse.TaskPlanningSections(
                section(active, Bucket.TODAY, now),
                section(active, Bucket.NEXT_3_DAYS, now),
                section(active, Bucket.NEXT_7_DAYS, now),
                section(active, Bucket.LATER, now),
                section(active, Bucket.OVERDUE, now),
                recentDone(tasks, now)
        );

        return new TaskPlanningResponse(
                now,
                availableFocusMinutes,
                tasks.stream().map(TaskResponse::from).toList(),
                nowSuggestion(active, recommendations, now, availableFocusMinutes),
                recommendations.stream()
                        .map((recommendation) -> new TaskPlanningResponse.TaskRecommendationResponse(
                                TaskResponse.from(recommendation.task()),
                                recommendation.score(),
                                recommendation.bucket().name(),
                                recommendation.reasons()
                        ))
                        .toList(),
                sections,
                active.stream()
                        .filter(this::isTimedTask)
                        .sorted(Comparator.comparing(Task::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(TaskResponse::from)
                        .toList()
        );
    }

    private TaskPlanningResponse.NowSuggestionResponse nowSuggestion(
            List<Task> active,
            List<TaskRecommendation> recommendations,
            LocalDateTime now,
            int availableFocusMinutes
    ) {
        Task currentTimedTask = active.stream()
                .filter(this::isTimedTask)
                .filter((task) -> isHappeningNow(task, now))
                .min(Comparator.comparing(Task::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
        if (currentTimedTask != null) {
            return new TaskPlanningResponse.NowSuggestionResponse(
                    "CURRENT_EVENT",
                    "지금은 " + currentTimedTask.getTitle() + " 중이에요.",
                    "해야할 일에 열심히 집중해봐요!",
                    TaskResponse.from(currentTimedTask),
                    null
            );
        }

        int hour = now.getHour();
        if ((hour >= 11 && hour < 13) || (hour >= 17 && hour < 19)) {
            return new TaskPlanningResponse.NowSuggestionResponse(
                    "MEAL",
                    "식사는 챙기셨나요?",
                    "집중하는 것도 좋지만 끼니는 잊지마세요!",
                    null,
                    null
            );
        }
        if (hour >= 5 && hour < 10) {
            return new TaskPlanningResponse.NowSuggestionResponse(
                    "DAY_START",
                    "오늘 흐름을 잡기 좋은 시간이에요.",
                    "짧은 일부터 하나 시작해볼까요?",
                    recommendations.isEmpty() ? null : TaskResponse.from(recommendations.getFirst().task()),
                    recommendations.isEmpty() ? null : availableFocusMinutes
            );
        }
        if (hour >= 21 && hour < 24) {
            return new TaskPlanningResponse.NowSuggestionResponse(
                    "DAY_END",
                    "하루를 마무리 할 시간이에요.",
                    "급한 일만 가볍게 정리해볼까요?",
                    recommendations.isEmpty() ? null : TaskResponse.from(recommendations.getFirst().task()),
                    recommendations.isEmpty() ? null : availableFocusMinutes
            );
        }
        if (hour >= 0 && hour < 5) {
            return new TaskPlanningResponse.NowSuggestionResponse(
                    "SLEEP",
                    "아직 안 주무시는 거 아니죠?",
                    "내일을 위해 숙면을 취해봐요.",
                    null,
                    null
            );
        }
        if (!recommendations.isEmpty()) {
            return new TaskPlanningResponse.NowSuggestionResponse(
                    "OPEN_SLOT",
                    "지금은 비어 있는 시간이에요.",
                    availableFocusMinutes + "분 정도 집중하기 좋은 일을 골라봤어요.",
                    TaskResponse.from(recommendations.getFirst().task()),
                    availableFocusMinutes
            );
        }

        Task studyTask = active.stream()
                .filter((task) -> task.getCategory() == Task.Category.STUDY)
                .sorted(planningComparator(now))
                .findFirst()
                .orElse(null);
        if (studyTask != null) {
            return new TaskPlanningResponse.NowSuggestionResponse(
                    "STUDY_NUDGE",
                    "지금은 비어 있는 시간이에요.",
                    "틈새 공부를 조금 해보는 건 어때요?",
                    TaskResponse.from(studyTask),
                    availableFocusMinutes
            );
        }

        return new TaskPlanningResponse.NowSuggestionResponse(
                "OPEN_SLOT",
                "지금은 비어 있는 시간이에요.",
                "스트레칭이나 책상 정리처럼 가벼운 것부터 해봐도 좋아요.",
                null,
                null
        );
    }

    private List<TaskResponse> section(List<Task> tasks, Bucket bucket, LocalDateTime now) {
        return tasks.stream()
                .filter((task) -> bucketOf(task, now) == bucket)
                .sorted(planningComparator(now))
                .map(TaskResponse::from)
                .toList();
    }

    private List<TaskResponse> recentDone(List<Task> tasks, LocalDateTime now) {
        LocalDateTime since = now.minusDays(RECENT_DONE_DAYS);
        return tasks.stream()
                .filter((task) -> task.getStatus() == Task.Status.DONE)
                .filter((task) -> task.getCompletedAt() == null || !task.getCompletedAt().isBefore(since))
                .sorted(Comparator.comparing(Task::getCompletedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(TaskResponse::from)
                .toList();
    }

    private TaskRecommendation recommend(Task task, LocalDateTime now, int availableFocusMinutes) {
        List<String> reasons = new ArrayList<>();
        int score = priorityScore(task) + categoryScore(task);
        Bucket bucket = bucketOf(task, now);

        switch (bucket) {
            case OVERDUE -> {
                score += 45;
                reasons.add("마감 시간이 이미 지나서 먼저 정리하는 게 좋아요.");
            }
            case TODAY -> {
                score += 40;
                reasons.add("오늘 마감이라 시간 압박이 커요.");
            }
            case NEXT_3_DAYS -> {
                score += 28;
                reasons.add("3일 안에 마감돼서 미리 시작하기 좋아요.");
            }
            case NEXT_7_DAYS -> {
                score += 16;
                reasons.add("일주일 안에 마감되는 일이에요.");
            }
            case LATER -> {
                if (task.getDeadline() == null) {
                    reasons.add("마감은 없지만 중요도를 기준으로 후보에 올렸어요.");
                }
            }
        }

        if (effectivePriority(task) >= 0.75) {
            reasons.add("중요도가 높은 편이에요.");
        }

        Integer estimatedMinutes = task.getEstimatedMinutes();
        if (estimatedMinutes != null) {
            if (estimatedMinutes <= Math.max(availableFocusMinutes, DEFAULT_FOCUS_MINUTES)) {
                score += 15;
                reasons.add(estimatedMinutes + "분 정도라 지금 한 번 집중하기 좋아요.");
            } else if (estimatedMinutes >= 90 && availableFocusMinutes < estimatedMinutes) {
                score -= 10;
                reasons.add("예상 시간이 길어서 작게 쪼개서 시작하는 게 좋아요.");
            }
        } else {
            score += 4;
        }

        if (task.getStatus() == Task.Status.IN_PROGRESS) {
            score += 12;
            reasons.add("이미 진행 중이라 이어서 하기 좋아요.");
        }

        if (reasons.isEmpty()) {
            reasons.add("마감과 중요도를 같이 봤을 때 지금 후보로 좋아요.");
        }

        return new TaskRecommendation(task, Math.max(0, score), bucket, reasons.stream().limit(3).toList());
    }

    private boolean isRecommendationCandidate(Task task, LocalDateTime now) {
        if (!isActive(task)) return false;
        if (task.getCategory() == Task.Category.APPOINTMENT) {
            return isTimedTaskActiveSoon(task, now, 30);
        }
        if (task.getCategory() == Task.Category.ROUTINE) {
            return isTimedTaskActiveSoon(task, now, 10);
        }
        if (isTimedTask(task)) {
            return isTimedTaskActiveSoon(task, now, 10);
        }
        return true;
    }

    private boolean isTimedTaskActiveSoon(Task task, LocalDateTime now, int leadMinutes) {
        if (!isTimedTask(task)) return false;
        LocalDateTime start = task.getStartTime();
        LocalDateTime end = task.getEndTime() != null
                ? task.getEndTime()
                : start.plusMinutes(Math.max(15, task.getEstimatedMinutes() != null ? task.getEstimatedMinutes() : 15));
        return !now.isBefore(start.minusMinutes(leadMinutes)) && now.isBefore(end);
    }

    private int availableFocusMinutes(List<Task> tasks, LocalDateTime now) {
        LocalDateTime defaultEnd = now.plusMinutes(DEFAULT_FOCUS_MINUTES);
        LocalDateTime nextTimedStart = tasks.stream()
                .filter(this::isActive)
                .filter(this::isTimedTask)
                .map(Task::getStartTime)
                .filter((start) -> start != null && start.isAfter(now))
                .min(LocalDateTime::compareTo)
                .orElse(defaultEnd);
        long minutes = Duration.between(now, nextTimedStart).toMinutes();
        return (int) Math.max(5, Math.min(120, minutes));
    }

    private Comparator<Task> planningComparator(LocalDateTime now) {
        return Comparator
                .comparing((Task task) -> bucketOf(task, now).sortOrder())
                .thenComparing((Task task) -> effectivePriority(task), Comparator.reverseOrder())
                .thenComparing(this::deadlineSortValue);
    }

    private Bucket bucketOf(Task task, LocalDateTime now) {
        LocalDateTime deadline = task.getDeadline();
        if (deadline == null) return Bucket.LATER;
        if (deadline.isBefore(now)) return Bucket.OVERDUE;
        if (!deadline.isAfter(endOfDay(now.toLocalDate()))) return Bucket.TODAY;
        if (!deadline.isAfter(endOfDay(now.toLocalDate().plusDays(3)))) return Bucket.NEXT_3_DAYS;
        if (!deadline.isAfter(endOfDay(now.toLocalDate().plusDays(7)))) return Bucket.NEXT_7_DAYS;
        return Bucket.LATER;
    }

    private boolean isTimedTask(Task task) {
        if (task.getStartTime() == null) return false;
        return task.getEndTime() != null
                || task.getRoutineId() != null
                || task.getCategory() == Task.Category.ROUTINE
                || Boolean.TRUE.equals(task.getIsLocked());
    }

    private boolean isHappeningNow(Task task, LocalDateTime now) {
        if (!isTimedTask(task)) return false;
        LocalDateTime start = task.getStartTime();
        LocalDateTime end = task.getEndTime() != null
                ? task.getEndTime()
                : start.plusMinutes(Math.max(15, task.getEstimatedMinutes() != null ? task.getEstimatedMinutes() : 15));
        return !now.isBefore(start) && now.isBefore(end);
    }

    private boolean isActive(Task task) {
        return task.getStatus() != Task.Status.DONE && task.getStatus() != Task.Status.CANCELLED;
    }

    private int priorityScore(Task task) {
        return (int) Math.round(effectivePriority(task) * 30);
    }

    private int categoryScore(Task task) {
        return switch (task.getCategory() != null ? task.getCategory() : Task.Category.OTHER) {
            case WORK, STUDY -> 8;
            case CHORE -> 4;
            case HOBBY -> -8;
            case HEALTH -> -4;
            case APPOINTMENT, ROUTINE -> -20;
            case OTHER -> 0;
        };
    }

    private double effectivePriority(Task task) {
        return task.getEffectivePriority() != null ? task.getEffectivePriority() : 0.5;
    }

    private LocalDateTime deadlineSortValue(Task task) {
        return task.getDeadline() != null ? task.getDeadline() : LocalDateTime.MAX;
    }

    private LocalDateTime endOfDay(LocalDate date) {
        return LocalDateTime.of(date, LocalTime.MAX);
    }

    private record TaskRecommendation(
            Task task,
            int score,
            Bucket bucket,
            List<String> reasons
    ) {}

    private enum Bucket {
        OVERDUE(0),
        TODAY(1),
        NEXT_3_DAYS(2),
        NEXT_7_DAYS(3),
        LATER(4);

        private final int sortOrder;

        Bucket(int sortOrder) {
            this.sortOrder = sortOrder;
        }

        int sortOrder() {
            return sortOrder;
        }
    }
}
