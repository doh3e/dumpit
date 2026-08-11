package com.dumpit.service.impl;

import com.dumpit.common.ActiveHours;
import com.dumpit.common.SnapshotText;
import com.dumpit.dto.RoutineRequest;
import com.dumpit.entity.Routine;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.exception.BadRequestException;
import com.dumpit.exception.ForbiddenException;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.RoutineRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.ActivityLogService;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.RoutineService;
import com.dumpit.service.UserSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoutineServiceImpl implements RoutineService {

    private final RoutineRepository routineRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final DeadlineNudgeService deadlineNudgeService;
    private final ActivityLogService activityLogService;
    private final UserSettingsService userSettingsService;

    @Override
    @Transactional(readOnly = true)
    public List<Routine> getRoutines(String email) {
        return routineRepository.findByUserAndDeletedAtIsNullOrderByEnabledDescCreatedAtDesc(findUser(email));
    }

    @Override
    @Transactional
    public Routine createRoutine(String email, RoutineRequest request) {
        User user = findUser(email);
        Routine routine = Routine.of(user, request.name().trim());
        apply(routine, request);
        Routine saved = routineRepository.save(routine);
        activityLogService.record(user, "ROUTINE_CREATED", "ROUTINE", saved.getRoutineId(), null, snapshot(saved));
        generateRoutineTaskIfDue(saved, LocalDateTime.now());
        return saved;
    }

    @Override
    @Transactional
    public Routine updateRoutine(String email, UUID routineId, RoutineRequest request) {
        Routine routine = findOwnedRoutine(email, routineId);
        Map<String, Object> before = snapshot(routine);
        apply(routine, request);
        Routine saved = routineRepository.save(routine);
        activityLogService.record(routine.getUser(), "ROUTINE_UPDATED", "ROUTINE", saved.getRoutineId(), before, snapshot(saved));
        generateRoutineTaskIfDue(saved, LocalDateTime.now());
        return saved;
    }

    @Override
    @Transactional
    public Routine toggleRoutine(String email, UUID routineId, boolean enabled) {
        Routine routine = findOwnedRoutine(email, routineId);
        Map<String, Object> before = snapshot(routine);
        routine.setEnabled(enabled);
        Routine saved = routineRepository.save(routine);
        activityLogService.record(routine.getUser(), "ROUTINE_TOGGLED", "ROUTINE", saved.getRoutineId(), before, snapshot(saved));
        if (enabled) {
            saved.setNextRunAt(calculateNextRunAt(saved, LocalDateTime.now().minusSeconds(1)));
            generateRoutineTaskIfDue(saved, LocalDateTime.now());
        } else {
            saved.setNextRunAt(null);
        }
        return saved;
    }

    @Override
    @Transactional
    public void deleteRoutine(String email, UUID routineId) {
        Routine routine = findOwnedRoutine(email, routineId);
        Map<String, Object> before = snapshot(routine);
        routine.markDeleted();
        Routine saved = routineRepository.save(routine);
        activityLogService.record(routine.getUser(), "ROUTINE_DELETED", "ROUTINE", saved.getRoutineId(), before, snapshot(saved));
    }

    @Override
    @Transactional
    public int generateDueRoutines() {
        LocalDateTime now = LocalDateTime.now();
        int generated = 0;

        backfillMissingNextRunAt(now);

        for (Routine routine : routineRepository.findDueRoutines(now)) {
            if (generateRoutineTaskIfDue(routine, now)) generated++;
        }

        return generated;
    }

    private void backfillMissingNextRunAt(LocalDateTime now) {
        for (Routine routine : routineRepository.findEnabledRoutinesMissingNextRunAt()) {
            routine.setNextRunAt(calculateNextRunAt(routine, now.minusSeconds(1)));
        }
    }

    @Override
    public boolean shouldGenerateOn(Routine routine, LocalDate date) {
        if (!Boolean.TRUE.equals(routine.getEnabled())) return false;
        if (routine.getDeletedAt() != null) return false;
        if (date.isBefore(routine.getStartDate())) return false;
        if (routine.getEndDate() != null && date.isAfter(routine.getEndDate())) return false;

        return switch (routine.getRepeatType()) {
            case DAILY -> true;
            case WEEKLY -> routine.dayOfWeekSet().contains(date.getDayOfWeek().getValue());
            case MONTHLY -> shouldGenerateMonthly(routine, date);
            case MONTHLY_WEEKDAY -> shouldGenerateMonthlyWeekday(routine, date);
        };
    }

    private void apply(Routine routine, RoutineRequest request) {
        routine.setName(request.name().trim());
        routine.setDescription(trimToNull(request.description()));
        routine.setEnabled(request.enabled() == null || request.enabled());
        routine.setRepeatType(request.repeatType());
        LocalTime requestedStartTime = request.routineStartTime() != null
                ? request.routineStartTime()
                : request.createTime();
        routine.setCreateTime(requestedStartTime);
        routine.setRoutineStartTime(requestedStartTime);
        routine.setRoutineEndTime(request.routineEndTime());
        routine.setStartDate(request.startDate());
        routine.setEndDate(request.endDate());
        routine.setRunOnLastDayIfMissing(Boolean.TRUE.equals(request.runOnLastDayIfMissing()));

        validateDateRange(request.startDate(), request.endDate());
        validateRoutineTimes(requestedStartTime, request.routineEndTime());
        validateRepeatRule(request);

        routine.setDaysOfWeek(toCsv(request.daysOfWeek()));
        routine.setDaysOfMonth(toCsv(request.daysOfMonth()));
        routine.setMonthlyWeekOrdinal(request.repeatType() == Routine.RepeatType.MONTHLY_WEEKDAY
                ? request.monthlyWeekOrdinal()
                : null);
        routine.setMonthlyWeekDay(request.repeatType() == Routine.RepeatType.MONTHLY_WEEKDAY
                ? request.monthlyWeekDay()
                : null);
        routine.setNextRunAt(Boolean.TRUE.equals(routine.getEnabled())
                ? calculateNextRunAt(routine, LocalDateTime.now().minusSeconds(1))
                : null);
    }

    private boolean shouldGenerateMonthly(Routine routine, LocalDate date) {
        Set<Integer> days = routine.dayOfMonthSet();
        if (days.contains(date.getDayOfMonth())) return true;
        if (!Boolean.TRUE.equals(routine.getRunOnLastDayIfMissing())) return false;

        int lastDay = YearMonth.from(date).lengthOfMonth();
        return date.getDayOfMonth() == lastDay
                && days.stream().anyMatch((day) -> day > lastDay);
    }

    private boolean shouldGenerateMonthlyWeekday(Routine routine, LocalDate date) {
        Integer ordinal = routine.getMonthlyWeekOrdinal();
        Integer dayOfWeek = routine.getMonthlyWeekDay();
        if (ordinal == null || dayOfWeek == null) return false;
        if (date.getDayOfWeek().getValue() != dayOfWeek) return false;
        return ((date.getDayOfMonth() - 1) / 7) + 1 == ordinal;
    }

    private boolean generateRoutineTaskIfDue(Routine routine, LocalDateTime now) {
        LocalDateTime nextRunAt = routine.getNextRunAt();
        if (nextRunAt == null || nextRunAt.isAfter(now)) return false;
        return generateRoutineTaskForDate(routine, nextRunAt.toLocalDate(), now);
    }

    private boolean generateRoutineTaskForDate(Routine routine, LocalDate date, LocalDateTime now) {
        if (!shouldGenerateOn(routine, date)) {
            routine.setNextRunAt(calculateNextRunAt(routine, now));
            return false;
        }
        if (date.equals(routine.getLastGeneratedDate())) {
            routine.setNextRunAt(calculateNextRunAt(routine, now));
            return false;
        }
        if (taskRepository.existsByRoutineRoutineIdAndRoutineScheduledDateAndDeletedAtIsNull(routine.getRoutineId(), date)) {
            routine.setLastGeneratedDate(date);
            routine.setNextRunAt(calculateNextRunAt(routine, now));
            return false;
        }

        LocalTime startTime = routineStartTime(routine);
        LocalTime endTime = routine.getRoutineEndTime();
        // 종료시각을 지정하지 않은 루틴의 기본 마감 = 사용자 활동 종료 시각 (2026-07-24 사용자 피드백,
        // AI "오늘까지" 해석과 동일 철학). wrap(야행성)이면 다음날 새벽까지.
        LocalDateTime deadline = endTime != null
                ? LocalDateTime.of(date, endTime)
                : defaultDeadline(userSettingsService.activeHours(routine.getUser().getEmail()), date, startTime, now);
        Task task = Task.of(
                routine.getUser(),
                routine.getName(),
                routine.getDescription(),
                deadline,
                null
        );
        if (startTime != null) {
            task.setStartTime(LocalDateTime.of(date, startTime));
        }
        if (startTime != null && endTime != null) {
            task.setEndTime(deadline);
            task.setIsLocked(true);
        }
        task.setCategory(Task.Category.ROUTINE);
        task.setAiPriorityScore(0.5);
        task.setRoutine(routine);
        task.setRoutineScheduledDate(date);

        try {
            Task saved = taskRepository.save(task);
            deadlineNudgeService.index(saved);
            activityLogService.record(routine.getUser(), "TASK_CREATED", "TASK", saved.getTaskId(), null, taskSnapshot(saved));
            routine.setLastGeneratedDate(date);
            routine.setNextRunAt(calculateNextRunAt(routine, now));
            return true;
        } catch (DataIntegrityViolationException ignored) {
            routine.setLastGeneratedDate(date);
            routine.setNextRunAt(calculateNextRunAt(routine, now));
            return false;
        }
    }

    /**
     * 종료시각 미지정 루틴의 기본 마감. 활동 종료가 이미 지났거나(늦은 생성) 태스크 시작시각보다
     * 이르면 종전 기본(23:59)으로 폴백해 시작>마감 역전을 막는다.
     */
    static LocalDateTime defaultDeadline(ActiveHours activeHours, LocalDate date, LocalTime startTime, LocalDateTime now) {
        LocalDateTime deadline = activeHours.dayEnd(date);
        LocalDateTime startAt = startTime != null ? LocalDateTime.of(date, startTime) : null;
        if (!deadline.isAfter(now) || (startAt != null && !deadline.isAfter(startAt))) {
            return LocalDateTime.of(date, LocalTime.of(23, 59));
        }
        return deadline;
    }

    private LocalDateTime calculateNextRunAt(Routine routine, LocalDateTime after) {
        LocalDate cursor = after.toLocalDate();
        if (cursor.isBefore(routine.getStartDate())) {
            cursor = routine.getStartDate();
        }

        LocalDate limit = routine.getEndDate() != null ? routine.getEndDate() : cursor.plusYears(5);
        while (!cursor.isAfter(limit)) {
            LocalDateTime candidate = nextRunCandidate(routine, cursor, after);
            if (!cursor.equals(routine.getLastGeneratedDate()) && candidate.isAfter(after) && shouldGenerateOn(routine, cursor)) {
                return candidate;
            }
            cursor = cursor.plusDays(1);
        }
        return null;
    }

    private LocalDateTime nextRunCandidate(Routine routine, LocalDate date, LocalDateTime after) {
        LocalTime startTime = routineStartTime(routine);
        if (startTime != null) {
            return LocalDateTime.of(date, startTime);
        }
        if (date.equals(after.toLocalDate())) {
            return after.plusSeconds(1);
        }
        return date.atStartOfDay().plusMinutes(5);
    }

    private LocalTime routineStartTime(Routine routine) {
        return routine.getRoutineStartTime() != null ? routine.getRoutineStartTime() : routine.getCreateTime();
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new BadRequestException("종료일은 시작일보다 빠를 수 없습니다.");
        }
    }

    private void validateRoutineTimes(LocalTime startTime, LocalTime endTime) {
        if (endTime != null && startTime == null) {
            throw new BadRequestException("루틴 종료 시간을 쓰려면 시작 시간도 선택해주세요.");
        }
        if (startTime != null && endTime != null && !endTime.isAfter(startTime)) {
            throw new BadRequestException("루틴 종료 시간은 시작 시간 이후로 설정해주세요.");
        }
    }

    private void validateRepeatRule(RoutineRequest request) {
        if (request.repeatType() == Routine.RepeatType.WEEKLY) {
            Set<Integer> days = request.daysOfWeek() == null ? Set.of() : request.daysOfWeek();
            if (days.isEmpty() || days.stream().anyMatch((day) -> day < 1 || day > 7)) {
                throw new BadRequestException("주간 루틴은 1~7 사이의 요일을 하나 이상 선택해야 합니다.");
            }
        }

        if (request.repeatType() == Routine.RepeatType.MONTHLY) {
            Set<Integer> days = request.daysOfMonth() == null ? Set.of() : request.daysOfMonth();
            if (days.isEmpty() || days.stream().anyMatch((day) -> day < 1 || day > 31)) {
                throw new BadRequestException("월간 루틴은 1~31 사이의 날짜를 하나 이상 선택해야 합니다.");
            }
        }

        if (request.repeatType() == Routine.RepeatType.MONTHLY_WEEKDAY) {
            if (request.monthlyWeekOrdinal() == null || request.monthlyWeekOrdinal() < 1 || request.monthlyWeekOrdinal() > 5) {
                throw new BadRequestException("월간 요일 루틴은 1~5 사이의 주차를 선택해야 합니다.");
            }
            if (request.monthlyWeekDay() == null || request.monthlyWeekDay() < 1 || request.monthlyWeekDay() > 7) {
                throw new BadRequestException("월간 요일 루틴은 1~7 사이의 요일을 선택해야 합니다.");
            }
        }
    }

    private String toCsv(Collection<Integer> values) {
        if (values == null || values.isEmpty()) return null;
        return values.stream()
                .sorted()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }

    private Routine findOwnedRoutine(String email, UUID routineId) {
        Routine routine = routineRepository.findActiveById(routineId)
                .orElseThrow(() -> new NotFoundException("루틴을 찾을 수 없습니다."));
        if (!routine.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 루틴에 접근할 권한이 없습니다.");
        }
        return routine;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private Map<String, Object> snapshot(Routine routine) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("routineId", routine.getRoutineId());
        SnapshotText.putMasked(values, "name", routine.getName());
        SnapshotText.putMasked(values, "description", routine.getDescription());
        values.put("enabled", routine.getEnabled());
        values.put("repeatType", routine.getRepeatType());
        values.put("daysOfWeek", routine.getDaysOfWeek());
        values.put("daysOfMonth", routine.getDaysOfMonth());
        values.put("monthlyWeekOrdinal", routine.getMonthlyWeekOrdinal());
        values.put("monthlyWeekDay", routine.getMonthlyWeekDay());
        values.put("runOnLastDayIfMissing", routine.getRunOnLastDayIfMissing());
        values.put("createTime", routine.getCreateTime());
        values.put("routineStartTime", routineStartTime(routine));
        values.put("routineEndTime", routine.getRoutineEndTime());
        values.put("startDate", routine.getStartDate());
        values.put("endDate", routine.getEndDate());
        values.put("lastGeneratedDate", routine.getLastGeneratedDate());
        values.put("nextRunAt", routine.getNextRunAt());
        values.put("deletedAt", routine.getDeletedAt());
        return values;
    }

    private Map<String, Object> taskSnapshot(Task task) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("taskId", task.getTaskId());
        SnapshotText.putMasked(values, "title", task.getTitle());
        SnapshotText.putMasked(values, "description", task.getDescription());
        values.put("status", task.getStatus());
        values.put("category", task.getCategory());
        values.put("deadline", task.getDeadline());
        values.put("routineId", task.getRoutineId());
        values.put("routineScheduledDate", task.getRoutineScheduledDate());
        values.put("deletedAt", task.getDeletedAt());
        return values;
    }
}
