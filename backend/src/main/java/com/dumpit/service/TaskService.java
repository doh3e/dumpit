package com.dumpit.service;

import com.dumpit.entity.Task;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface TaskService {

    List<Task> getTasksForUser(String email);

    List<Task> getTasksForUser(String email, Integer doneSinceDays);

    Task createTask(String email, String title, String description,
                    LocalDateTime deadline, Integer estimatedMinutes,
                    LocalDateTime startTime, LocalDateTime endTime,
                    Boolean isLocked, Task.Category category);

    Task updateTask(String email, UUID taskId, TaskUpdateFields fields);

    Task reanalyzePriority(String email, UUID taskId);

    OpenAiService.SubtaskResult proposeSubtasks(String email, UUID taskId);

    List<Task> createSubtasks(String email, UUID parentTaskId, List<SubtaskInput> subtasks);

    void deleteTask(String email, UUID taskId);

    record SubtaskInput(
            String title,
            String description,
            Integer estimatedMinutes
    ) {}

    record TaskUpdateFields(
            String title,
            String description,
            boolean hasDescription,
            String status,
            Double userPriorityScore,
            boolean hasUserPriorityScore,
            LocalDateTime deadline,
            boolean hasDeadline,
            Integer estimatedMinutes,
            boolean hasEstimatedMinutes,
            LocalDateTime startTime,
            boolean hasStartTime,
            LocalDateTime endTime,
            boolean hasEndTime,
            Boolean isLocked,
            boolean hasIsLocked,
            Task.Category category
    ) {}
}
