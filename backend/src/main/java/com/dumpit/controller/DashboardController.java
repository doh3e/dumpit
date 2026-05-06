package com.dumpit.controller;

import com.dumpit.dto.TaskPlanningResponse;
import com.dumpit.service.TaskPlanningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final TaskPlanningService taskPlanningService;

    @GetMapping("/planning")
    public ResponseEntity<TaskPlanningResponse> getPlanning(@AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(taskPlanningService.getPlanning(principal.getAttribute("email")));
    }
}
