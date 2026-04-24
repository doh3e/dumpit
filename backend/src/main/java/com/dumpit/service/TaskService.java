package com.dumpit.service;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final OpenAiService openAiService;

    @Transactional(readOnly = true)
    public List<Task> getTasksForUser(String email) {
        User user = findUser(email);
        return taskRepository.findByUserOrderByPriority(user);
    }

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

        OpenAiService.PriorityResult priority =
                openAiService.scorePriority(title, description, deadline, estimatedMinutes);
        task.setAiPriorityScore(priority.score());

        if (category != null) {
            task.setCategory(category);
        } else {
            task.setCategory(parseCategory(priority.category()));
        }

        return taskRepository.save(task);
    }

    private Task.Category parseCategory(String raw) {
        if (raw == null || raw.isBlank()) return Task.Category.OTHER;
        try {
            return Task.Category.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Task.Category.OTHER;
        }
    }

    @Transactional
    public Task updateTask(String email, UUID taskId, TaskUpdateFields fields) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("권한이 없습니다");
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

        // DONE 전환 시 코인 지급 (우선순위 기반: 10~50)
        if (prevStatus != Task.Status.DONE && task.getStatus() == Task.Status.DONE) {
            double priority = task.getEffectivePriority() != null ? task.getEffectivePriority() : 0.5;
            int coins = (int) (10 + priority * 40);
            task.getUser().addCoins(coins);
            userRepository.save(task.getUser());
        }

        // DONE → 되돌릴 때 코인 회수
        if (prevStatus == Task.Status.DONE && task.getStatus() != Task.Status.DONE) {
            double priority = task.getEffectivePriority() != null ? task.getEffectivePriority() : 0.5;
            int coins = (int) (10 + priority * 40);
            task.getUser().spendCoins(coins);
            userRepository.save(task.getUser());
        }

        return taskRepository.save(task);
    }

    @Transactional
    public Task reanalyzePriority(String email, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("권한이 없습니다");
        }

        OpenAiService.PriorityResult priority =
                openAiService.scorePriority(task.getTitle(), task.getDescription(),
                        task.getDeadline(), task.getEstimatedMinutes());
        task.setAiPriorityScore(priority.score());
        task.setUserPriorityScore(null);

        return taskRepository.save(task);
    }

    @Transactional(readOnly = true)
    public OpenAiService.SubtaskResult proposeSubtasks(String email, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("권한이 없습니다");
        }

        return openAiService.proposeSubtasks(task.getTitle(), task.getDescription(),
                task.getEstimatedMinutes());
    }

    @Transactional
    public List<Task> createSubtasks(String email, UUID parentTaskId, List<SubtaskInput> subtasks) {
        Task parent = taskRepository.findById(parentTaskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다"));

        if (!parent.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("권한이 없습니다");
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

            created.add(taskRepository.save(child));
        }
        return created;
    }

    @Transactional
    public void deleteTask(String email, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("권한이 없습니다");
        }

        taskRepository.delete(task);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다"));
    }

    public record SubtaskInput(
            String title,
            String description,
            Integer estimatedMinutes
    ) {}

    public record TaskUpdateFields(
            String title,
            String description,
            String status,
            Double userPriorityScore,
            LocalDateTime deadline,
            Integer estimatedMinutes,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Boolean isLocked,
            Task.Category category
    ) {}
}
