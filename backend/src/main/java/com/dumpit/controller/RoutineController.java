package com.dumpit.controller;

import com.dumpit.dto.RoutineRequest;
import com.dumpit.dto.RoutineResponse;
import com.dumpit.entity.Routine;
import com.dumpit.service.RoutineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    @GetMapping
    public ResponseEntity<List<RoutineResponse>> getRoutines(@AuthenticationPrincipal OAuth2User principal) {
        List<Routine> routines = routineService.getRoutines(principal.getAttribute("email"));
        return ResponseEntity.ok(routines.stream().map(RoutineResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<RoutineResponse> createRoutine(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody RoutineRequest request) {
        Routine routine = routineService.createRoutine(principal.getAttribute("email"), request);
        return ResponseEntity.ok(RoutineResponse.from(routine));
    }

    @PatchMapping("/{routineId}")
    public ResponseEntity<RoutineResponse> updateRoutine(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID routineId,
            @Valid @RequestBody RoutineRequest request) {
        Routine routine = routineService.updateRoutine(principal.getAttribute("email"), routineId, request);
        return ResponseEntity.ok(RoutineResponse.from(routine));
    }

    @PatchMapping("/{routineId}/enabled")
    public ResponseEntity<RoutineResponse> toggleRoutine(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID routineId,
            @RequestBody ToggleRequest request) {
        Routine routine = routineService.toggleRoutine(
                principal.getAttribute("email"),
                routineId,
                request.enabled()
        );
        return ResponseEntity.ok(RoutineResponse.from(routine));
    }

    @DeleteMapping("/{routineId}")
    public ResponseEntity<Void> deleteRoutine(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID routineId) {
        routineService.deleteRoutine(principal.getAttribute("email"), routineId);
        return ResponseEntity.noContent().build();
    }

    public record ToggleRequest(boolean enabled) {}
}
