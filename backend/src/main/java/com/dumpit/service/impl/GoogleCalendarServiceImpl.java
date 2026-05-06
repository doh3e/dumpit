package com.dumpit.service.impl;

import com.dumpit.exception.ApiException;
import com.dumpit.service.GoogleCalendarService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleCalendarServiceImpl implements GoogleCalendarService {

    private final ObjectMapper objectMapper;

    private static final String CALENDAR_API = "https://www.googleapis.com/calendar/v3";

    @Override
    public List<CalendarEvent> getEvents(String accessTokenValue, Instant timeMin, Instant timeMax) {
        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(CALENDAR_API)
                    .defaultHeader("Authorization", "Bearer " + accessTokenValue)
                    .build();

            String raw = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/calendars/primary/events")
                            .queryParam("timeMin", timeMin.toString())
                            .queryParam("timeMax", timeMax.toString())
                            .queryParam("singleEvents", true)
                            .queryParam("orderBy", "startTime")
                            .queryParam("maxResults", 250)
                            .build())
                    .retrieve()
                    .body(String.class);

            GoogleEventsResponse response = objectMapper.readValue(raw, GoogleEventsResponse.class);

            if (response.items() == null) return Collections.emptyList();

            return response.items().stream()
                    .map(item -> new CalendarEvent(
                            item.id(),
                            item.summary() != null ? item.summary() : "(제목 없음)",
                            parseDateTime(item.start()),
                            parseDateTime(item.end())
                    ))
                    .toList();

        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
                        "Google Calendar 연결이 만료되었습니다. 다시 연결해주세요."
                );
            }
            log.error("Google Calendar API 호출 실패: status={}, body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "GOOGLE_CALENDAR_UNAVAILABLE",
                    "Google Calendar 일정을 불러오지 못했습니다."
            );
        } catch (Exception e) {
            log.error("Google Calendar API 호출 실패: {}", e.getMessage());
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "GOOGLE_CALENDAR_UNAVAILABLE",
                    "Google Calendar 일정을 불러오지 못했습니다."
            );
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
            log.debug("날짜 파싱 실패: {}", e.getMessage());
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
