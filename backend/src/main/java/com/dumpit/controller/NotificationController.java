package com.dumpit.controller;

import com.dumpit.dto.DeadlineNudgeResponse;
import com.dumpit.service.DeadlineNudgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final DeadlineNudgeService deadlineNudgeService;

    @GetMapping("/deadline-nudges")
    public ResponseEntity<List<DeadlineNudgeResponse>> getDeadlineNudges(
            @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(deadlineNudgeService.getNudges(principal.getAttribute("email")));
    }
}
