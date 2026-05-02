package com.dumpit.controller;

import com.dumpit.service.GoogleCalendarService;
import com.dumpit.service.GoogleCalendarService.CalendarEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private static final String CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

    private final GoogleCalendarService googleCalendarService;
    private final OAuth2AuthorizedClientRepository authorizedClientRepository;

    @GetMapping("/events")
    public ResponseEntity<?> getEvents(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        OAuth2AuthorizedClient client = authorizedClientRepository
                .loadAuthorizedClient("google", authentication, request);

        if (client == null || client.getAccessToken() == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        OAuth2AccessToken accessToken = client.getAccessToken();
        if (!accessToken.getScopes().contains(CALENDAR_READONLY_SCOPE)) {
            return ResponseEntity.status(403).body(new CalendarPermissionRequiredResponse(
                    "CALENDAR_PERMISSION_REQUIRED",
                    "Google Calendar 일정을 불러오려면 캘린더 읽기 권한이 필요합니다."
            ));
        }

        List<CalendarEvent> events = googleCalendarService.getUpcomingEvents(accessToken.getTokenValue());
        return ResponseEntity.ok(events);
    }

    record CalendarPermissionRequiredResponse(String code, String message) {}
}
