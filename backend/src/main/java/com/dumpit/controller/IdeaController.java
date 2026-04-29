package com.dumpit.controller;

import com.dumpit.dto.IdeaBulkRequest;
import com.dumpit.dto.IdeaRequest;
import com.dumpit.dto.IdeaResponse;
import com.dumpit.dto.IdeaUpdateRequest;
import com.dumpit.entity.Idea;
import com.dumpit.entity.Task;
import com.dumpit.service.IdeaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ideas")
@RequiredArgsConstructor
public class IdeaController {

    private final IdeaService ideaService;

    @GetMapping
    public ResponseEntity<List<IdeaResponse>> getIdeas(@AuthenticationPrincipal OAuth2User principal) {
        List<Idea> ideas = ideaService.getIdeas(principal.getAttribute("email"));
        return ResponseEntity.ok(ideas.stream().map(IdeaResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<IdeaResponse> createIdea(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody IdeaRequest request) {
        Idea idea = ideaService.createIdea(
                principal.getAttribute("email"),
                request.title(),
                request.content(),
                request.pinned(),
                request.category(),
                request.parentIdeaId()
        );
        return ResponseEntity.ok(IdeaResponse.from(idea));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<IdeaResponse>> createIdeasFromLines(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody IdeaBulkRequest request) {
        List<Idea> ideas = ideaService.createIdeasFromLines(
                principal.getAttribute("email"),
                request.rawText(),
                request.category(),
                request.parentIdeaId()
        );
        return ResponseEntity.ok(ideas.stream().map(IdeaResponse::from).toList());
    }

    @PatchMapping("/{ideaId}")
    public ResponseEntity<IdeaResponse> updateIdea(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID ideaId,
            @Valid @RequestBody IdeaUpdateRequest request) {
        Idea idea = ideaService.updateIdea(
                principal.getAttribute("email"),
                ideaId,
                request.title(),
                request.content(),
                request.pinned(),
                request.category(),
                request.parentIdeaId()
        );
        return ResponseEntity.ok(IdeaResponse.from(idea));
    }

    @PostMapping("/{ideaId}/convert-to-task")
    public ResponseEntity<?> convertToTask(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID ideaId) {
        Task task = ideaService.convertToTask(principal.getAttribute("email"), ideaId);
        return ResponseEntity.ok(com.dumpit.dto.TaskResponse.from(task));
    }

    @DeleteMapping("/{ideaId}")
    public ResponseEntity<Void> deleteIdea(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID ideaId) {
        ideaService.deleteIdea(principal.getAttribute("email"), ideaId);
        return ResponseEntity.noContent().build();
    }
}
