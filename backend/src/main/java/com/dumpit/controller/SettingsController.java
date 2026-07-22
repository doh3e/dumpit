package com.dumpit.controller;

import com.dumpit.dto.UserSettingsResponse;
import com.dumpit.dto.UserSettingsUpdateRequest;
import com.dumpit.service.UserSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/me/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final UserSettingsService userSettingsService;

    @GetMapping
    public ResponseEntity<UserSettingsResponse> getSettings(@AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(userSettingsService.getSettings(principal.getAttribute("email")));
    }

    @PatchMapping
    public ResponseEntity<UserSettingsResponse> updateSettings(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody UserSettingsUpdateRequest request) {
        return ResponseEntity.ok(userSettingsService.updateSettings(principal.getAttribute("email"), request));
    }
}
