package com.dumpit.service.impl;

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
import com.dumpit.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
                           Boolean isLocked, Task.Category category) {
        User user = findUser(email);
        validateFutureDeadline(deadline);
        Task task = Task.of(user, title, description, deadline, estimatedMinutes);

        if (startTime != null) task.setStartTime(startTime);
        if (endTime != null) task.setEndTime(endTime);
        if (isLocked != null) task.setIsLocked(isLocked);

        aiUsageService.consume(email, AiUsageService.UsageType.TASK_PRIORITY);
        OpenAiService.PriorityResult priority =
                openAiService.scorePriority(title, description, deadline, estimatedMinutes);
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

        Task.Status prevStatus = task.getStatus();
        Map<String, Object> before = snapshot(task);

        if (fields.title() != null) task.setTitle(fields.title());
        if (fields.hasDescription()) task.setDescription(fields.description());
        if (fields.status() != null) task.setStatus(Task.Status.valueOf(fields.status()));
        if (fields.hasDeadline()) {
            validateFutureDeadline(fields.deadline());
            task.setDeadline(fields.deadline());
        }
        if (fields.hasEstimatedMinutes()) task.setEstimatedMinutes(fields.estimatedMinutes());
        if (fields.hasStartTime()) task.setStartTime(fields.startTime());
        if (fields.hasEndTime()) task.setEndTime(fields.endTime());
        if (fields.hasIsLocked()) task.setIsLocked(Boolean.TRUE.equals(fields.isLocked()));
        if (fields.hasUserPriorityScore()) task.setUserPriorityScore(fields.userPriorityScore());
        if (fields.category() != null) task.setCategory(fields.category());

        if (prevStatus != Task.Status.DONE && task.getStatus() == Task.Status.DONE) {
            task.setCompletedAt(LocalDateTime.now());
            int coins = calcCompletionCoins(task);
            task.getUser().addCoins(coins);
            userRepository.save(task.getUser());
        }

        if (prevStatus == Task.Status.DONE && task.getStatus() != Task.Status.DONE) {
            task.setCompletedAt(null);
            int coins = calcCompletionCoins(task);
            task.getUser().spendCoins(coins);
            userRepository.save(task.getUser());
        }

        Task saved = taskRepository.save(task);
        deadlineNudgeService.index(saved);
        activityLogService.record(task.getUser(), "TASK_UPDATED", "TASK", saved.getTaskId(), before, snapshot(saved));
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
        deadlineNudgeService.remove(task);
        task.setDeletedAt(LocalDateTime.now());
        Task saved = taskRepository.save(task);
        activityLogService.record(task.getUser(), "TASK_DELETED", "TASK", saved.getTaskId(), before, snapshot(saved));
    }

    private int calcCompletionCoins(Task task) {
        if (task.getParentTask() != null) {
            return 0;
        }
        LocalDateTime deadline = task.getDeadline();
        if (deadline != null && deadline.isBefore(LocalDateTime.now())) {
            return 5;
        }
        double priority = task.getEffectivePriority() != null ? task.getEffectivePriority() : 0.5;
        return (int) (10 + priority * 40);
    }

    private void validateFutureDeadline(LocalDateTime deadline) {
        if (deadline != null && !deadline.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("마감일시는 현재 시간 이후로 설정해야 합니다.");
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
        values.put("title", task.getTitle());
        values.put("description", task.getDescription());
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
        values.put("deletedAt", task.getDeletedAt());
        return values;
    }
}
