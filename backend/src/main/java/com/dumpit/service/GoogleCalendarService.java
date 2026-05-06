package com.dumpit.service;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;

public interface GoogleCalendarService {

    List<CalendarEvent> getEvents(String accessTokenValue, Instant timeMin, Instant timeMax);

    record CalendarEvent(
            String id,
            String summary,
            LocalDateTime start,
            LocalDateTime end
    ) {}
}
