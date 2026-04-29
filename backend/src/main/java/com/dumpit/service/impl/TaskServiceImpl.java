package com.dumpit.service.impl;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.AiUsageService;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.OpenAiService;
import com.dumpit.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final OpenAiService openAiService;
    private final DeadlineNudgeService deadlineNudgeService;
    private final AiUsageService aiUsageService;

    @Override
    @Transactional(readOnly = true)
    public List<Task> getTasksForUser(String email) {
        User user = findUser(email);
        return taskRepository.findByUserOrderByPriority(user);
    }

    @Override
    @Transactional
    public Task createTask(String email, String title, String description,
                           LocalDateTime deadline, Integer estimatedMinutes,
                           LocalDateTime startTime, LocalDateTime endTime,
                           Boolean isLocked, Task.Category category) {
        User user = findUser(email);
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
        return saved;
    }

    @Override
    @Transactional
    public Task updateTask(String email, UUID taskId, TaskUpdateFields fields) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Unauthorized");
        }

        Task.Status prevStatus = task.getStatus();

        if (fields.title() != null) task.setTitle(fields.title());
        if (fields.description() != null) task.setDescription(fields.description());
        if (fields.status() != null) task.setStatus(Task.Status.valueOf(fields.status()));
        if (fields.deadline() != null) task.setDeadline(fields.deadline());
        if (fields.estimatedMinutes() != null) task.setEstimatedMinutes(fields.estimatedMinutes());
        if (fields.startTime() != null) task.setStartTime(fields.startTime());
        if (fields.endTime() != null) task.setEndTime(fields.endTime());
        if (fields.isLocked() != null) task.setIsLocked(fields.isLocked());
        if (fields.userPriorityScore() != null) task.setUserPriorityScore(fields.userPriorityScore());
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
        return saved;
    }

    @Override
    @Transactional
    public Task reanalyzePriority(String email, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Unauthorized");
        }

        aiUsageService.consume(email, AiUsageService.UsageType.TASK_REANALYZE);
        OpenAiService.PriorityResult priority =
                openAiService.scorePriority(task.getTitle(), task.getDescription(),
                        task.getDeadline(), task.getEstimatedMinutes());
        task.setAiPriorityScore(priority.score());
        task.setUserPriorityScore(null);

        return taskRepository.save(task);
    }

    @Override
    @Transactional(readOnly = true)
    public OpenAiService.SubtaskResult proposeSubtasks(String email, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Unauthorized");
        }

        aiUsageService.consume(email, AiUsageService.UsageType.SUBTASK_PROPOSAL);
        return openAiService.proposeSubtasks(task.getTitle(), task.getDescription(),
                task.getEstimatedMinutes());
    }

    @Override
    @Transactional
    public List<Task> createSubtasks(String email, UUID parentTaskId, List<SubtaskInput> subtasks) {
        Task parent = taskRepository.findById(parentTaskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (!parent.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Unauthorized");
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
            created.add(saved);
        }
        return created;
    }

    @Override
    @Transactional
    public void deleteTask(String email, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Unauthorized");
        }

        deadlineNudgeService.remove(task);
        taskRepository.delete(task);
    }

    private int calcCompletionCoins(Task task) {
        LocalDateTime deadline = task.getDeadline();
        if (deadline != null && deadline.isBefore(LocalDateTime.now())) {
            return 5;
        }
        double priority = task.getEffectivePriority() != null ? task.getEffectivePriority() : 0.5;
        return (int) (10 + priority * 40);
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
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
