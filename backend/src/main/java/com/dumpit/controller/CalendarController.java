package com.dumpit.controller;

import com.dumpit.service.GoogleCalendarService;
import com.dumpit.service.GoogleCalendarService.CalendarEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.core.OAuth2AuthorizationException;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private static final String CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
    private static final Duration TOKEN_REFRESH_SKEW = Duration.ofMinutes(5);

    private final GoogleCalendarService googleCalendarService;
    private final OAuth2AuthorizedClientManager authorizedClientManager;

    @GetMapping("/events")
    public ResponseEntity<?> getEvents(HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        OAuth2AuthorizeRequest authorizeRequest = OAuth2AuthorizeRequest
                .withClientRegistrationId("google")
                .principal(authentication)
                .attribute(HttpServletRequest.class.getName(), request)
                .attribute(HttpServletResponse.class.getName(), response)
                .build();
        OAuth2AuthorizedClient client;
        try {
            client = authorizedClientManager.authorize(authorizeRequest);
        } catch (OAuth2AuthorizationException ex) {
            return reconnectRequired();
        }

        if (client == null || client.getAccessToken() == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        OAuth2AccessToken accessToken = client.getAccessToken();
        if (isExpiredOrExpiring(accessToken)) {
            return reconnectRequired();
        }

        if (!accessToken.getScopes().contains(CALENDAR_READONLY_SCOPE)) {
            return ResponseEntity.status(403).body(new CalendarPermissionRequiredResponse(
                    "CALENDAR_PERMISSION_REQUIRED",
                    "Google Calendar 일정을 불러오려면 캘린더 읽기 권한이 필요합니다."
            ));
        }

        List<CalendarEvent> events = googleCalendarService.getUpcomingEvents(accessToken.getTokenValue());
        return ResponseEntity.ok(events);
    }

    private ResponseEntity<CalendarPermissionRequiredResponse> reconnectRequired() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new CalendarPermissionRequiredResponse(
                "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
                "Google Calendar 연결이 만료되었습니다. 다시 연결해주세요."
        ));
    }

    private boolean isExpiredOrExpiring(OAuth2AccessToken accessToken) {
        Instant expiresAt = accessToken.getExpiresAt();
        return expiresAt != null && expiresAt.minus(TOKEN_REFRESH_SKEW).isBefore(Instant.now());
    }

    record CalendarPermissionRequiredResponse(String code, String message) {}
}
