package com.dumpit.service.impl;

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
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
        generateRoutineTaskForDate(saved, LocalDate.now());
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
        generateRoutineTaskForDate(saved, LocalDate.now());
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
            generateRoutineTaskForDate(saved, LocalDate.now());
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
        LocalDate today = LocalDate.now();
        int generated = 0;

        for (Routine routine : routineRepository.findGenerationCandidates(today)) {
            if (generateRoutineTaskForDate(routine, today)) generated++;
        }

        return generated;
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
            case MONTHLY -> routine.dayOfMonthSet().contains(date.getDayOfMonth());
        };
    }

    private void apply(Routine routine, RoutineRequest request) {
        routine.setName(request.name().trim());
        routine.setDescription(trimToNull(request.description()));
        routine.setEnabled(request.enabled() == null || request.enabled());
        routine.setRepeatType(request.repeatType());
        routine.setCreateTime(request.createTime() != null ? request.createTime() : LocalTime.of(6, 0));
        routine.setStartDate(request.startDate());
        routine.setEndDate(request.endDate());

        validateDateRange(request.startDate(), request.endDate());
        validateRepeatRule(request);

        routine.setDaysOfWeek(toCsv(request.daysOfWeek()));
        routine.setDaysOfMonth(toCsv(request.daysOfMonth()));
    }

    private boolean generateRoutineTaskForDate(Routine routine, LocalDate date) {
        if (!shouldGenerateOn(routine, date)) return false;
        if (date.equals(routine.getLastGeneratedDate())) return false;
        if (taskRepository.existsByRoutineRoutineIdAndRoutineScheduledDateAndDeletedAtIsNull(routine.getRoutineId(), date)) {
            routine.setLastGeneratedDate(date);
            return false;
        }

        LocalDateTime routineDateTime = LocalDateTime.of(date, routine.getCreateTime());
        Task task = Task.of(
                routine.getUser(),
                routine.getName(),
                routine.getDescription(),
                routineDateTime,
                null
        );
        task.setStartTime(routineDateTime);
        task.setCategory(Task.Category.ROUTINE);
        task.setAiPriorityScore(0.5);
        task.setRoutine(routine);
        task.setRoutineScheduledDate(date);

        try {
            Task saved = taskRepository.save(task);
            deadlineNudgeService.index(saved);
            activityLogService.record(routine.getUser(), "TASK_CREATED", "TASK", saved.getTaskId(), null, taskSnapshot(saved));
            routine.setLastGeneratedDate(date);
            return true;
        } catch (DataIntegrityViolationException ignored) {
            routine.setLastGeneratedDate(date);
            return false;
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new BadRequestException("종료일은 시작일보다 빠를 수 없습니다.");
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
        values.put("name", routine.getName());
        values.put("description", routine.getDescription());
        values.put("enabled", routine.getEnabled());
        values.put("repeatType", routine.getRepeatType());
        values.put("daysOfWeek", routine.getDaysOfWeek());
        values.put("daysOfMonth", routine.getDaysOfMonth());
        values.put("createTime", routine.getCreateTime());
        values.put("startDate", routine.getStartDate());
        values.put("endDate", routine.getEndDate());
        values.put("lastGeneratedDate", routine.getLastGeneratedDate());
        values.put("deletedAt", routine.getDeletedAt());
        return values;
    }

    private Map<String, Object> taskSnapshot(Task task) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("taskId", task.getTaskId());
        values.put("title", task.getTitle());
        values.put("description", task.getDescription());
        values.put("status", task.getStatus());
        values.put("category", task.getCategory());
        values.put("deadline", task.getDeadline());
        values.put("routineId", task.getRoutineId());
        values.put("routineScheduledDate", task.getRoutineScheduledDate());
        values.put("deletedAt", task.getDeletedAt());
        return values;
    }
}
