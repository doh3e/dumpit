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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private static final String CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
    private static final Duration DEFAULT_LOOKAHEAD = Duration.ofDays(30);
    private static final Duration MAX_RANGE = Duration.ofDays(370);

    private final GoogleCalendarService googleCalendarService;
    private final OAuth2AuthorizedClientManager authorizedClientManager;

    @GetMapping("/events")
    public ResponseEntity<?> getEvents(
            @RequestParam(required = false) String timeMin,
            @RequestParam(required = false) String timeMax,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
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

        if (!client.getAccessToken().getScopes().contains(CALENDAR_READONLY_SCOPE)) {
            return ResponseEntity.status(403).body(new CalendarPermissionRequiredResponse(
                    "CALENDAR_PERMISSION_REQUIRED",
                    "Google Calendar 일정을 불러오려면 캘린더 읽기 권한이 필요합니다."
            ));
        }

        Instant start = parseInstantOrDefault(timeMin, Instant.now());
        Instant end = parseInstantOrDefault(timeMax, start.plus(DEFAULT_LOOKAHEAD));
        if (!end.isAfter(start)) {
            end = start.plus(DEFAULT_LOOKAHEAD);
        }
        if (Duration.between(start, end).compareTo(MAX_RANGE) > 0) {
            end = start.plus(MAX_RANGE);
        }

        List<CalendarEvent> events = googleCalendarService.getEvents(client.getAccessToken().getTokenValue(), start, end);
        return ResponseEntity.ok(events);
    }

    private Instant parseInstantOrDefault(String value, Instant fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            return fallback;
        }
    }

    private ResponseEntity<CalendarPermissionRequiredResponse> reconnectRequired() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new CalendarPermissionRequiredResponse(
                "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
                "Google Calendar 연결이 만료되었습니다. 다시 연결해주세요."
        ));
    }

    record CalendarPermissionRequiredResponse(String code, String message) {}
}
