package com.dumpit.controller;

import com.dumpit.service.AiUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai-usage")
@RequiredArgsConstructor
public class AiUsageController {

    private final AiUsageService aiUsageService;

    @GetMapping
    public ResponseEntity<AiUsageService.AiUsageStatus> getStatus(
            @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(aiUsageService.getStatus(principal.getAttribute("email")));
    }
}
