package com.dumpit.controller;

import com.dumpit.dto.TaskRequest;
import com.dumpit.dto.TaskResponse;
import com.dumpit.dto.TaskUpdateRequest;
import com.dumpit.entity.Task;
import com.dumpit.service.OpenAiService;
import com.dumpit.service.TaskService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasks(@AuthenticationPrincipal OAuth2User principal) {
        List<Task> tasks = taskService.getTasksForUser(principal.getAttribute("email"));
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
        return ResponseEntity.ok(TaskResponse.from(task));
    }

    @PatchMapping("/{taskId}")
    public ResponseEntity<TaskResponse> updateTask(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody TaskUpdateRequest req) {
        Task task = taskService.updateTask(
                principal.getAttribute("email"),
                taskId,
                new TaskService.TaskUpdateFields(
                        req.title(), req.description(), req.status(),
                        req.userPriorityScore(), req.deadline(),
                        req.estimatedMinutes(), req.startTime(), req.endTime(),
                        req.isLocked(), req.category()
                )
        );
        return ResponseEntity.ok(TaskResponse.from(task));
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
        return ResponseEntity.ok(children.stream().map(TaskResponse::from).toList());
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
