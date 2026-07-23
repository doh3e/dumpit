import { api } from './client';

/** 백엔드 GoogleCalendarService.CalendarEvent — start/end는 KST 벽시계 LocalDateTime */
export type CalendarEvent = {
  id: string;
  summary: string | null;
  start: string | null;
  end: string | null;
};

/**
 * timeMin/timeMax는 서버가 Instant.parse로 읽으므로 UTC Z 포맷 필수 — Date.toISOString() 사용.
 * 캘린더 미연동 세션은 빈 배열. 권한 문제는 403 코드 CALENDAR_PERMISSION_REQUIRED /
 * GOOGLE_CALENDAR_RECONNECT_REQUIRED로 옴(앱은 웹 연결 안내로 대체).
 */
export async function fetchCalendarEvents(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
  const res = await api.get('/calendar/events', {
    params: { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() },
  });
  return res.data;
}
