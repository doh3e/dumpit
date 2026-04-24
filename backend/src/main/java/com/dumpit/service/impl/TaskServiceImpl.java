package com.dumpit.service.impl;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
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

    @Override
    @Transactional
    public Task updateTask(String email, UUID taskId, TaskUpdateFields fields) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("?쒖뒪?щ? 李얠쓣 ???놁뒿?덈떎"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("沅뚰븳???놁뒿?덈떎");
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
            double priority = task.getEffectivePriority() != null ? task.getEffectivePriority() : 0.5;
            int coins = (int) (10 + priority * 40);
            task.getUser().addCoins(coins);
            userRepository.save(task.getUser());
        }

        if (prevStatus == Task.Status.DONE && task.getStatus() != Task.Status.DONE) {
            double priority = task.getEffectivePriority() != null ? task.getEffectivePriority() : 0.5;
            int coins = (int) (10 + priority * 40);
            task.getUser().spendCoins(coins);
            userRepository.save(task.getUser());
        }

        return taskRepository.save(task);
    }

    @Override
    @Transactional
    public Task reanalyzePriority(String email, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("?쒖뒪?щ? 李얠쓣 ???놁뒿?덈떎"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("沅뚰븳???놁뒿?덈떎");
        }

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
                .orElseThrow(() -> new IllegalArgumentException("?쒖뒪?щ? 李얠쓣 ???놁뒿?덈떎"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("沅뚰븳???놁뒿?덈떎");
        }

        return openAiService.proposeSubtasks(task.getTitle(), task.getDescription(),
                task.getEstimatedMinutes());
    }

    @Override
    @Transactional
    public List<Task> createSubtasks(String email, UUID parentTaskId, List<SubtaskInput> subtasks) {
        Task parent = taskRepository.findById(parentTaskId)
                .orElseThrow(() -> new IllegalArgumentException("?쒖뒪?щ? 李얠쓣 ???놁뒿?덈떎"));

        if (!parent.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("沅뚰븳???놁뒿?덈떎");
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

    @Override
    @Transactional
    public void deleteTask(String email, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("?쒖뒪?щ? 李얠쓣 ???놁뒿?덈떎"));

        if (!task.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("沅뚰븳???놁뒿?덈떎");
        }

        taskRepository.delete(task);
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
                .orElseThrow(() -> new IllegalArgumentException("?좎?瑜?李얠쓣 ???놁뒿?덈떎"));
    }
}
