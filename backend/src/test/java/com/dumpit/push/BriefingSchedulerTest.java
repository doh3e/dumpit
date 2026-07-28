package com.dumpit.push;

import com.dumpit.dto.UserSettingsResponse;
import com.dumpit.entity.User;
import com.dumpit.repository.DeviceTokenRepository;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.TaskPlanningService;
import com.dumpit.service.UserSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BriefingSchedulerTest {

    DeviceTokenRepository tokens = mock(DeviceTokenRepository.class);
    UserSettingsService settings = mock(UserSettingsService.class);
    TaskPlanningService planning = mock(TaskPlanningService.class);
    DeadlineNudgeService nudges = mock(DeadlineNudgeService.class);
    PushDispatchService dispatch = mock(PushDispatchService.class);
    StringRedisTemplate redis = mock(StringRedisTemplate.class);
    ValueOperations<String, String> valueOps = mock(ValueOperations.class);
    BriefingScheduler scheduler;

    // 09시 정각 — routineStartHour 9 유저가 대상
    LocalDateTime nineAm = LocalDateTime.of(2026, 7, 29, 9, 0);

    @BeforeEach
    void setUp() throws Exception {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        scheduler = new BriefingScheduler(tokens, settings, planning, nudges, dispatch, redis);
        User u = TestUsers.withEmail("a@test");   // Task 7 테스트의 리플렉션 헬퍼를 공용 클래스로 추출해 재사용
        when(tokens.findDistinctUsers()).thenReturn(List.of(u));
    }

    @Test
    void 활동_시작_시각_유저에게_브리핑을_보낸다() {
        when(settings.getSettings("a@test")).thenReturn(new UserSettingsResponse(9, 22, true, List.of(60), true));
        when(planning.todayTasks("a@test")).thenReturn(List.of(mock(com.dumpit.dto.TaskResponse.class)));
        when(nudges.getNudges("a@test")).thenReturn(List.of());
        when(dispatch.drainHeldCount(any())).thenReturn(2L);

        scheduler.runAt(nineAm);

        verify(dispatch).sendToUserDevices(any(), argThat(m ->
                m.channelId().equals("push-briefing")
                        && m.body().contains("오늘 할 일 1개")
                        && m.body().contains("밤사이 알림 2건")));
    }

    @Test
    void 시작_시각이_아닌_유저는_건너뛴다() {
        when(settings.getSettings("a@test")).thenReturn(new UserSettingsResponse(10, 22, true, List.of(60), true));
        scheduler.runAt(nineAm);
        verify(dispatch, never()).sendToUserDevices(any(), any());
    }

    @Test
    void 브리핑을_끈_유저는_보류만_비우고_보내지_않는다() {
        when(settings.getSettings("a@test")).thenReturn(new UserSettingsResponse(9, 22, true, List.of(60), false));
        scheduler.runAt(nineAm);
        verify(dispatch, never()).sendToUserDevices(any(), any());
        verify(dispatch).drainHeldCount(any());   // 보류분 소멸(스펙 결정 3)
    }

    @Test
    void 내용이_전부_0이면_스킵한다() {
        when(settings.getSettings("a@test")).thenReturn(new UserSettingsResponse(9, 22, true, List.of(60), true));
        when(planning.todayTasks("a@test")).thenReturn(List.of());
        when(nudges.getNudges("a@test")).thenReturn(List.of());
        when(dispatch.drainHeldCount(any())).thenReturn(0L);
        scheduler.runAt(nineAm);
        verify(dispatch, never()).sendToUserDevices(any(), any());
    }

    @Test
    void 같은_날_두번_돌아도_한_번만_보낸다() {
        when(settings.getSettings("a@test")).thenReturn(new UserSettingsResponse(9, 22, true, List.of(60), true));
        when(planning.todayTasks("a@test")).thenReturn(List.of(mock(com.dumpit.dto.TaskResponse.class)));
        when(nudges.getNudges("a@test")).thenReturn(List.of());
        when(dispatch.drainHeldCount(any())).thenReturn(0L);
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true).thenReturn(false);
        scheduler.runAt(nineAm);
        scheduler.runAt(nineAm);
        verify(dispatch, times(1)).sendToUserDevices(any(), any());
    }
}
