package com.dumpit.service.impl;

import com.dumpit.service.GoogleCalendarService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleCalendarServiceImpl implements GoogleCalendarService {

    private final ObjectMapper objectMapper;

    private static final String CALENDAR_API = "https://www.googleapis.com/calendar/v3";

    @Override
    public List<CalendarEvent> getUpcomingEvents(String accessTokenValue) {
        try {
            Instant now = Instant.now();
            Instant end = now.plus(30, ChronoUnit.DAYS);

            RestClient restClient = RestClient.builder()
                    .baseUrl(CALENDAR_API)
                    .defaultHeader("Authorization", "Bearer " + accessTokenValue)
                    .build();

            String raw = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/calendars/primary/events")
                            .queryParam("timeMin", now.toString())
                            .queryParam("timeMax", end.toString())
                            .queryParam("singleEvents", true)
                            .queryParam("orderBy", "startTime")
                            .queryParam("maxResults", 50)
                            .build())
                    .retrieve()
                    .body(String.class);

            GoogleEventsResponse response = objectMapper.readValue(raw, GoogleEventsResponse.class);

            if (response.items() == null) return Collections.emptyList();

            return response.items().stream()
                    .map(item -> new CalendarEvent(
                            item.id(),
                            item.summary() != null ? item.summary() : "(?쒕ぉ ?놁쓬)",
                            parseDateTime(item.start()),
                            parseDateTime(item.end())
                    ))
                    .toList();

        } catch (Exception e) {
            log.error("Google Calendar API ?몄텧 ?ㅽ뙣: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private LocalDateTime parseDateTime(GoogleDateTime dt) {
        if (dt == null) return null;
        try {
            if (dt.dateTime() != null) {
                return LocalDateTime.parse(dt.dateTime(), DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            }
            if (dt.date() != null) {
                return LocalDateTime.parse(dt.date() + "T00:00:00");
            }
        } catch (Exception e) {
            log.debug("?좎쭨 ?뚯떛 ?ㅽ뙣: {}", e.getMessage());
        }
        return null;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GoogleEventsResponse(List<GoogleEvent> items) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GoogleEvent(String id, String summary, GoogleDateTime start, GoogleDateTime end) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GoogleDateTime(String dateTime, String date) {}
}
