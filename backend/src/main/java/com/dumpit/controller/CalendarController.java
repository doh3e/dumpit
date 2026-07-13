package com.dumpit.controller;

import com.dumpit.exception.ApiException;
import com.dumpit.service.GoogleCalendarService;
import com.dumpit.service.GoogleCalendarService.CalendarEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
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
@Slf4j
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
            log.warn("Google Calendar authorized client refresh failed: errorCode={}, description={}",
                    ex.getError() != null ? ex.getError().getErrorCode() : null,
                    ex.getError() != null ? ex.getError().getDescription() : null);
            throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
                    "Google Calendar 연결이 만료되었습니다. 다시 연결해주세요.");
        }

        if (client == null || client.getAccessToken() == null) {
            log.warn("Google Calendar authorized client is missing: clientPresent={}, accessTokenPresent={}",
                    client != null,
                    client != null && client.getAccessToken() != null);
            return ResponseEntity.ok(Collections.emptyList());
        }

        log.debug("Google Calendar authorized client loaded: accessTokenExpiresAt={}, refreshTokenPresent={}, scopes={}",
                client.getAccessToken().getExpiresAt(),
                client.getRefreshToken() != null,
                client.getAccessToken().getScopes());

        if (!client.getAccessToken().getScopes().contains(CALENDAR_READONLY_SCOPE)) {
            log.warn("Calendar scope missing on stored token: scopes={}, accessTokenExpiresAt={}, refreshTokenPresent={}",
                    client.getAccessToken().getScopes(),
                    client.getAccessToken().getExpiresAt(),
                    client.getRefreshToken() != null);
            throw new ApiException(HttpStatus.FORBIDDEN, "CALENDAR_PERMISSION_REQUIRED",
                    "Google Calendar 일정을 불러오려면 캘린더 읽기 권한이 필요합니다. 다시 연동해주세요.");
        }

        Instant start = parseInstantOrDefault(timeMin, Instant.now());
        Instant end = parseInstantOrDefault(timeMax, start.plus(DEFAULT_LOOKAHEAD));
        if (!end.isAfter(start)) {
            end = start.plus(DEFAULT_LOOKAHEAD);
        }
        if (Duration.between(start, end).compareTo(MAX_RANGE) > 0) {
            end = start.plus(MAX_RANGE);
        }

        try {
            List<CalendarEvent> events = googleCalendarService.getEvents(client.getAccessToken().getTokenValue(), start, end);
            return ResponseEntity.ok(events);
        } catch (ApiException ex) {
            if ("GOOGLE_CALENDAR_RECONNECT_REQUIRED".equals(ex.getCode())) {
                log.warn("Token state at Calendar API rejection: accessTokenExpiresAt={}, refreshTokenPresent={}, scopes={}",
                        client.getAccessToken().getExpiresAt(),
                        client.getRefreshToken() != null,
                        client.getAccessToken().getScopes());
            }
            throw ex;
        }
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
}
