package com.dumpit.controller;

import com.dumpit.dto.TaskRequest;
import com.dumpit.dto.TaskResponse;
import com.dumpit.entity.Task;
import com.dumpit.exception.BadRequestException;
import com.dumpit.service.OpenAiService;
import com.dumpit.service.TaskService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasks(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestParam(required = false) Integer doneSinceDays
    ) {
        List<Task> tasks = taskService.getTasksForUser(principal.getAttribute("email"), doneSinceDays);
        return ResponseEntity.ok(tasks.stream().map(TaskResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody TaskRequest req) {
        Task task = taskService.createTask(
                principal.getAttribute("email"),
                req.title(), req.description(),
                req.deadline(), req.estimatedMinutes(),
                req.startTime(), req.endTime(), req.isLocked(),
                req.category()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(TaskResponse.from(task));
    }

    @PatchMapping("/{taskId}")
    public ResponseEntity<TaskResponse> updateTask(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("taskId") UUID taskId,
            @RequestBody Map<String, Object> req) {
        String title = value(req, "title", String.class);
        String description = value(req, "description", String.class);
        if (title != null && title.length() > 200) {
            throw new BadRequestException("할 일은 200자 이하로 입력해주세요.");
        }
        if (description != null && description.length() > 1000) {
            throw new BadRequestException("메모는 1000자 이하로 입력해주세요.");
        }

        Task task = taskService.updateTask(
                principal.getAttribute("email"),
                taskId,
                new TaskService.TaskUpdateFields(
                        title,
                        description,
                        req.containsKey("description"),
                        value(req, "status", String.class),
                        value(req, "userPriorityScore", Double.class),
                        req.containsKey("userPriorityScore"),
                        value(req, "deadline", LocalDateTime.class),
                        req.containsKey("deadline"),
                        value(req, "estimatedMinutes", Integer.class),
                        req.containsKey("estimatedMinutes"),
                        value(req, "startTime", LocalDateTime.class),
                        req.containsKey("startTime"),
                        value(req, "endTime", LocalDateTime.class),
                        req.containsKey("endTime"),
                        value(req, "isLocked", Boolean.class),
                        req.containsKey("isLocked"),
                        value(req, "category", Task.Category.class)
                )
        );
        return ResponseEntity.ok(TaskResponse.from(task));
    }

    private <T> T value(Map<String, Object> req, String key, Class<T> type) {
        if (!req.containsKey(key) || req.get(key) == null) {
            return null;
        }
        try {
            return objectMapper.convertValue(req.get(key), type);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(key + " 값을 확인해주세요.");
        }
    }

    @PostMapping("/{taskId}/reanalyze")
    public ResponseEntity<TaskResponse> reanalyzePriority(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("taskId") UUID taskId) {
        Task task = taskService.reanalyzePriority(principal.getAttribute("email"), taskId);
        return ResponseEntity.ok(TaskResponse.from(task));
    }

    @PostMapping("/{taskId}/split/propose")
    public ResponseEntity<OpenAiService.SubtaskResult> proposeSplit(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("taskId") UUID taskId) {
        return ResponseEntity.ok(taskService.proposeSubtasks(principal.getAttribute("email"), taskId));
    }

    @PostMapping("/{taskId}/split")
    public ResponseEntity<List<TaskResponse>> createSplit(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody SplitRequest req) {
        List<TaskService.SubtaskInput> subtasks = req.subtasks().stream()
                .map((subtask) -> new TaskService.SubtaskInput(
                        subtask.title(),
                        subtask.description(),
                        subtask.estimatedMinutes()
                ))
                .toList();
        List<Task> children = taskService.createSubtasks(
                principal.getAttribute("email"), taskId, subtasks);
        return ResponseEntity.status(HttpStatus.CREATED).body(children.stream().map(TaskResponse::from).toList());
    }

    public record SplitRequest(List<@Valid SubtaskRequest> subtasks) {}

    public record SubtaskRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 1000) String description,
            Integer estimatedMinutes
    ) {}

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("taskId") UUID taskId) {
        taskService.deleteTask(principal.getAttribute("email"), taskId);
        return ResponseEntity.noContent().build();
    }
}
