package com.dumpit.controller;

import com.dumpit.dto.TaskRequest;
import com.dumpit.dto.TaskResponse;
import com.dumpit.dto.TaskUpdateRequest;
import com.dumpit.entity.Task;
import com.dumpit.service.TaskService;
import jakarta.validation.Valid;
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
                req.startTime(), req.endTime(), req.isLocked()
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
                        req.isLocked()
                )
        );
        return ResponseEntity.ok(TaskResponse.from(task));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("taskId") UUID taskId) {
        taskService.deleteTask(principal.getAttribute("email"), taskId);
        return ResponseEntity.noContent().build();
    }
}
