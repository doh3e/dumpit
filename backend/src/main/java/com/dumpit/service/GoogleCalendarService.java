package com.dumpit.service;

import java.time.LocalDateTime;
import java.util.List;

public interface GoogleCalendarService {

    List<CalendarEvent> getUpcomingEvents(String accessTokenValue);

    record CalendarEvent(
            String id,
            String summary,
            LocalDateTime start,
            LocalDateTime end
    ) {}
}
