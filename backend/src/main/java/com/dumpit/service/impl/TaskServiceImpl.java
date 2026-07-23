package com.dumpit.service.impl;

import com.dumpit.common.SnapshotText;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.exception.BadRequestException;
import com.dumpit.exception.ForbiddenException;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.ActivityLogService;
import com.dumpit.service.AiUsageService;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.OpenAiService;
import com.dumpit.service.ShopService;
import com.dumpit.service.TaskService;
import com.dumpit.service.UserSettingsService;
import com.dumpit.service.priority.PriorityCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final OpenAiService openAiService;
    private final DeadlineNudgeService deadlineNudgeService;
    private final AiUsageService aiUsageService;
    private final ActivityLogService activityLogService;
    private final ShopService shopService;
    private final UserSettingsService userSettingsService;

    @Override
    @Transactional(readOnly = true)
    public List<Task> getTasksForUser(String email) {
        User user = findUser(email);
        return taskRepository.findByUserOrderByPriority(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Task> getTasksForUser(String email, Integer doneSinceDays) {
        if (doneSinceDays == null) {
            return getTasksForUser(email);
        }
        if (doneSinceDays < 1 || doneSinceDays > 365) {
            throw new BadRequestException("doneSinceDays는 1일부터 365일 사이로 입력해주세요.");
        }

        User user = findUser(email);
        LocalDateTime doneSince = LocalDateTime.now().minusDays(doneSinceDays);
        return taskRepository.findByUserWithRecentDoneOrderByPriority(user, doneSince);
    }

    @Override
    @Transactional
    public Task createTask(String email, String title, String description,
                           LocalDateTime deadline, Integer estimatedMinutes,
                           LocalDateTime startTime, LocalDateTime endTime,
                           Boolean isLocked, Task.Category category, boolean noDeadline) {
        if (noDeadline && deadline != null) {
            throw new BadRequestException("기한 없는 일에는 마감 시간을 함께 보낼 수 없어요.");
        }
        User user = findUser(email);
        ScheduleFields schedule = inferScheduleIfNeeded(email, title, description, startTime, deadline, estimatedMinutes, noDeadline);
        validateSchedule(schedule.startTime(), schedule.deadline(), schedule.estimatedMinutes());
        Task task = Task.of(user, title, description, schedule.deadline(), schedule.estimatedMinutes());

        if (schedule.startTime() != null) task.setStartTime(schedule.startTime());
        if (endTime != null) task.setEndTime(endTime);
        else if (schedule.deadline() != null && schedule.startTime() != null) task.setEndTime(schedule.deadline());
        if (isLocked != null) task.setIsLocked(isLocked);
        else if (startTime != null) task.setIsLocked(true); // 사용자가 직접 입력한 시작시간만 고정 — 마감에서 파생된 슬롯은 잠그지 않는다

        aiUsageService.consume(email, AiUsageService.UsageType.TASK_PRIORITY);
        OpenAiService.PriorityResult priority =
                openAiService.scorePriority(title, description, schedule.deadline(), schedule.estimatedMinutes());
        task.setAiPriorityScore(priority.score());

        if (category != null) {
            task.setCategory(category);
        } else {
            task.setCategory(parseCategory(priority.category()));
        }

        Task saved = taskRepository.save(task);
        deadlineNudgeService.index(saved);
        activityLogService.record(user, "TASK_CREATED", "TASK", saved.getTaskId(), null, snapshot(saved));
        return saved;
    }

    @Override
    @Transactional
    public Task updateTask(String email, UUID taskId, TaskUpdateFields fields) {
        Task task = taskRepository.findActiveById(taskId)
                .orElseThrow(() -> new NotFoundException("태스크를 찾을 수 없습니다."));

        if (!task.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 태스크에 접근할 권한이 없습니다.");
        }

        if (fields.noDeadline() && fields.hasDeadline() && fields.deadline() != null) {
            throw new BadRequestException("기한 없는 일에는 마감 시간을 함께 보낼 수 없어요.");
        }

        Task.Status prevStatus = task.getStatus();
        Map<String, Object> before = snapshot(task);

        String nextTitle = fields.title() != null ? fields.title() : task.getTitle();
        String nextDescription = fields.hasDescription() ? fields.description() : task.getDescription();
        LocalDateTime nextDeadline = fields.noDeadline() ? null
                : (fields.hasDeadline() ? fields.deadline() : task.getDeadline());
        Integer nextEstimatedMinutes = fields.hasEstimatedMinutes() ? fields.estimatedMinutes() : task.getEstimatedMinutes();
        LocalDateTime nextStartTime = fields.hasStartTime() ? fields.startTime() : task.getStartTime();
        boolean scheduleTouched = fields.hasDeadline() || fields.hasEstimatedMinutes()
                || fields.hasStartTime() || fields.noDeadline();
        ScheduleFields nextSchedule = scheduleTouched
                ? inferScheduleIfNeeded(email, nextTitle, nextDescription, nextStartTime, nextDeadline, nextEstimatedMinutes, fields.noDeadline())
                : new ScheduleFields(nextStartTime, nextDeadline, nextEstimatedMinutes);

        if (fields.title() != null) task.setTitle(fields.title());
        if (fields.hasDescription()) task.setDescription(fields.description());
        if (fields.status() != null) task.setStatus(parseStatus(fields.status()));
        if (scheduleTouched) {
            validateSchedule(nextSchedule.startTime(), nextSchedule.deadline(), nextSchedule.estimatedMinutes());
            task.setStartTime(nextSchedule.startTime());
            task.setDeadline(nextSchedule.deadline());
            task.setEstimatedMinutes(nextSchedule.estimatedMinutes());
            task.setEndTime(nextSchedule.startTime() != null && nextSchedule.deadline() != null
                    ? nextSchedule.deadline()
                    : null);
            task.setIsLocked(nextSchedule.startTime() != null);
        }
        if (fields.hasEndTime()) task.setEndTime(fields.endTime());
        if (fields.hasIsLocked()) task.setIsLocked(Boolean.TRUE.equals(fields.isLocked()));
        if (fields.hasUserPriorityScore()) task.setUserPriorityScore(fields.userPriorityScore());
        if (fields.category() != null) task.setCategory(fields.category());

        if (prevStatus != Task.Status.DONE && task.getStatus() == Task.Status.DONE) {
            // 점감 카운트는 completedAt 설정 전에 계산 — 지금 완료하는 이 태스크가 스스로를 세지 않게
            int coins = calcGrantCoins(task);
            task.setCompletedAt(LocalDateTime.now());
            task.setCoinsGranted(coins);
            task.getUser().addCoins(coins);
            userRepository.save(task.getUser());
        }

        if (prevStatus == Task.Status.DONE && task.getStatus() != Task.Status.DONE) {
            task.setCompletedAt(null);
            // 재계산하지 않고 지급했던 금액을 그대로 회수 — 마감·우선순위를 바꾼 뒤 해제하는 증식 차단
            task.getUser().reclaimCoins(task.getCoinsGranted());
            task.setCoinsGranted(0);
            userRepository.save(task.getUser());
        }

        Task saved = taskRepository.save(task);
        deadlineNudgeService.index(saved);
        Map<String, Object> after = snapshot(saved);
        activityLogService.record(task.getUser(), TaskChangeClassifier.classify(before, after), "TASK", saved.getTaskId(), before, after);
        return saved;
    }

    @Override
    @Transactional
    public Task updateSticker(String email, UUID taskId, String code) {
        Task task = taskRepository.findActiveById(taskId)
                .orElseThrow(() -> new NotFoundException("태스크를 찾을 수 없습니다."));

        if (!task.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 태스크에 접근할 권한이 없습니다.");
        }

        if (code != null) {
            shopService.assertOwnsSticker(task.getUser(), code);
        }
        Map<String, Object> before = snapshot(task);
        task.setStickerCode(code);
        Task saved = taskRepository.save(task);
        activityLogService.record(task.getUser(), "TASK_STICKER_UPDATED", "TASK", saved.getTaskId(), before, snapshot(saved));
        return saved;
    }

    @Override
    @Transactional
    public Task reanalyzePriority(String email, UUID taskId) {
        Task task = taskRepository.findActiveById(taskId)
                .orElseThrow(() -> new NotFoundException("태스크를 찾을 수 없습니다."));

        if (!task.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 태스크에 접근할 권한이 없습니다.");
        }

        Map<String, Object> before = snapshot(task);
        aiUsageService.consume(email, AiUsageService.UsageType.TASK_REANALYZE);
        OpenAiService.PriorityResult priority =
                openAiService.scorePriority(task.getTitle(), task.getDescription(),
                        task.getDeadline(), task.getEstimatedMinutes());
        task.setAiPriorityScore(priority.score());
        task.setUserPriorityScore(null);

        Task saved = taskRepository.save(task);
        activityLogService.record(task.getUser(), "TASK_REANALYZED", "TASK", saved.getTaskId(), before, snapshot(saved));
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public OpenAiService.SubtaskResult proposeSubtasks(String email, UUID taskId) {
        Task task = taskRepository.findActiveById(taskId)
                .orElseThrow(() -> new NotFoundException("태스크를 찾을 수 없습니다."));

        if (!task.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 태스크에 접근할 권한이 없습니다.");
        }

        aiUsageService.consume(email, AiUsageService.UsageType.SUBTASK_PROPOSAL);
        return openAiService.proposeSubtasks(task.getTitle(), task.getDescription(),
                task.getEstimatedMinutes());
    }

    @Override
    @Transactional
    public List<Task> createSubtasks(String email, UUID parentTaskId, List<SubtaskInput> subtasks) {
        Task parent = taskRepository.findActiveById(parentTaskId)
                .orElseThrow(() -> new NotFoundException("태스크를 찾을 수 없습니다."));

        if (!parent.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 태스크에 접근할 권한이 없습니다.");
        }

        User user = parent.getUser();
        List<Task> created = new java.util.ArrayList<>();
        for (SubtaskInput input : subtasks) {
            if (input.title() == null || input.title().isBlank()) continue;

            Task child = Task.of(user, input.title().trim(),
                    input.description() != null ? input.description().trim() : null,
                    parent.getDeadline(), input.estimatedMinutes());
            child.setParentTask(parent);
            child.setCategory(parent.getCategory());
            child.setAiPriorityScore(parent.getAiPriorityScore());

            Task saved = taskRepository.save(child);
            deadlineNudgeService.index(saved);
            activityLogService.record(user, "TASK_CREATED", "TASK", saved.getTaskId(), null, snapshot(saved));
            created.add(saved);
        }
        return created;
    }

    @Override
    @Transactional
    public void deleteTask(String email, UUID taskId) {
        Task task = taskRepository.findActiveById(taskId)
                .orElseThrow(() -> new NotFoundException("태스크를 찾을 수 없습니다."));

        if (!task.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 태스크에 접근할 권한이 없습니다.");
        }

        Map<String, Object> before = snapshot(task);

        // 오늘 완료한 태스크를 지우면 지급 코인도 반납 — 완료→삭제 반복 파밍 차단.
        // 어제 이전 완료분 삭제는 히스토리 정리로 보고 회수하지 않는다.
        if (task.getStatus() == Task.Status.DONE
                && task.getCoinsGranted() > 0
                && task.getCompletedAt() != null
                && !task.getCompletedAt().isBefore(LocalDate.now().atStartOfDay())) {
            task.getUser().reclaimCoins(task.getCoinsGranted());
            task.setCoinsGranted(0);
            userRepository.save(task.getUser());
        }

        deadlineNudgeService.remove(task);
        task.setDeletedAt(LocalDateTime.now());
        Task saved = taskRepository.save(task);
        activityLogService.record(task.getUser(), "TASK_DELETED", "TASK", saved.getTaskId(), before, snapshot(saved));
    }

    // 하루 10개까지 풀지급, 이후 5코인 고정 — 파밍의 기대수익을 꾸준함의 페이스로 묶는다
    private static final int DAILY_FULL_REWARD_LIMIT = 10;
    private static final int TAPERED_COINS = 5;

    private int calcGrantCoins(Task task) {
        int base = calcCompletionCoins(task);
        if (base == 0) {
            return 0;
        }
        long completedToday = taskRepository.countCompletedSince(task.getUser(), LocalDate.now().atStartOfDay());
        if (completedToday >= DAILY_FULL_REWARD_LIMIT) {
            return Math.min(base, TAPERED_COINS);
        }
        return base;
    }

    private int calcCompletionCoins(Task task) {
        if (task.getParentTask() != null) {
            return 0;
        }
        LocalDateTime deadline = task.getDeadline();
        if (deadline != null && deadline.isBefore(LocalDateTime.now())) {
            return 5;
        }
        // 리스트 +N 미리보기(TaskResponse)와 같은 실시간 합성값 — 표시·지급 불일치 방지
        Double effective = PriorityCalculator.effectivePriority(task, LocalDateTime.now());
        double priority = effective != null ? effective : 0.5;
        return (int) (10 + priority * 40);
    }

    private ScheduleFields inferScheduleIfNeeded(String email, String title, String description,
                                                 LocalDateTime startTime,
                                                 LocalDateTime deadline,
                                                 Integer estimatedMinutes,
                                                 boolean noDeadline) {
        if (noDeadline) {
            // '언젠가' 선언: 마감·시작시간은 추론으로 채우지 않는다 — 유저가 입력한 시작시간만 보존
            Integer minutes = estimatedMinutes != null
                    ? estimatedMinutes
                    : openAiService.inferSchedule(title, description, startTime, null, null,
                            userSettingsService.activeHours(email)).estimatedMinutes();
            return new ScheduleFields(startTime, null, minutes);
        }
        // 마감이 확정돼 있고 다른 시간 정보도 있으면 AI 호출 없이 그대로 사용.
        // 시작~마감 간격을 예상시간으로 환산하던 슬롯 파생은 하지 않는다 — 예상시간은 집중 작업량 의미
        if (deadline != null && (startTime != null || estimatedMinutes != null)) {
            return new ScheduleFields(startTime, deadline, estimatedMinutes);
        }
        OpenAiService.ScheduleInferenceResult inferred =
                openAiService.inferSchedule(title, description, startTime, deadline, estimatedMinutes,
                        userSettingsService.activeHours(email));
        LocalDateTime nextStart = startTime != null ? startTime : parseDateTime(inferred.startTime());
        LocalDateTime nextDeadline = deadline != null ? deadline : parseDateTime(inferred.deadline());
        // AI 추론값이 시작≥마감 쌍을 만들면 추론된 쪽을 버린다 — 유저 입력은 보존
        if (nextStart != null && nextDeadline != null && !nextDeadline.isAfter(nextStart)) {
            if (startTime == null) nextStart = null;
            else nextDeadline = null;
        }
        return new ScheduleFields(nextStart, nextDeadline,
                estimatedMinutes != null ? estimatedMinutes : inferred.estimatedMinutes());
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private void validateSchedule(LocalDateTime startTime, LocalDateTime deadline, Integer estimatedMinutes) {
        if (estimatedMinutes != null && (estimatedMinutes < 1 || estimatedMinutes > 1440)) {
            throw new BadRequestException("예상 시간은 1분부터 1440분 사이로 입력해주세요.");
        }
        if (startTime != null && deadline != null && !deadline.isAfter(startTime)) {
            throw new BadRequestException("마감 시간은 시작 시간 이후로 설정해주세요.");
        }
        validateFutureDeadline(deadline);
    }

    private void validateFutureDeadline(LocalDateTime deadline) {
        if (deadline != null && !deadline.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("마감일시는 현재 시간 이후로 설정해야 합니다.");
        }
    }

    private Task.Status parseStatus(String raw) {
        try {
            return Task.Status.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("상태 값을 확인해주세요.");
        }
    }

    private Task.Category parseCategory(String raw) {
        if (raw == null || raw.isBlank()) return Task.Category.OTHER;
        try {
            return Task.Category.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Task.Category.OTHER;
        }
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }

    private Map<String, Object> snapshot(Task task) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("taskId", task.getTaskId());
        SnapshotText.putMasked(values, "title", task.getTitle());
        SnapshotText.putMasked(values, "description", task.getDescription());
        values.put("status", task.getStatus());
        values.put("category", task.getCategory());
        values.put("deadline", task.getDeadline());
        values.put("estimatedMinutes", task.getEstimatedMinutes());
        values.put("startTime", task.getStartTime());
        values.put("endTime", task.getEndTime());
        values.put("isLocked", task.getIsLocked());
        values.put("aiPriorityScore", task.getAiPriorityScore());
        values.put("userPriorityScore", task.getUserPriorityScore());
        values.put("parentTaskId", task.getParentTask() != null ? task.getParentTask().getTaskId() : null);
        values.put("routineId", task.getRoutineId());
        values.put("routineScheduledDate", task.getRoutineScheduledDate());
        values.put("stickerCode", task.getStickerCode());
        values.put("deletedAt", task.getDeletedAt());
        return values;
    }

    private record ScheduleFields(
            LocalDateTime startTime,
            LocalDateTime deadline,
            Integer estimatedMinutes
    ) {}
}
