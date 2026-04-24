package com.dumpit.service;

import com.dumpit.entity.Task;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface TaskService {

    List<Task> getTasksForUser(String email);

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
