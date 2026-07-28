package com.dumpit.push;

import com.dumpit.common.ActiveHours;
import com.dumpit.dto.DeadlineNudgeResponse;
import com.dumpit.dto.UserSettingsResponse;
import com.dumpit.entity.User;
import com.dumpit.repository.DeviceTokenRepository;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.UserSettingsService;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DeadlinePushSchedulerTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 29, 14, 0);

    DeviceTokenRepository tokens = mock(DeviceTokenRepository.class);
    UserSettingsService settings = mock(UserSettingsService.class);
    DeadlineNudgeService nudges = mock(DeadlineNudgeService.class);
    PushDispatchService dispatch = mock(PushDispatchService.class);
    DeadlinePushScheduler scheduler = new DeadlinePushScheduler(tokens, settings, nudges, dispatch);

    private DeadlineNudgeResponse nudge(String taskId, LocalDateTime deadline) {
        return new DeadlineNudgeResponse(UUID.fromString(taskId), "테스트 작업", deadline, 60, false);
    }

    @Test
    void 알림을_끈_유저는_건너뛴다() throws Exception {
        when(tokens.findDistinctUsers()).thenReturn(List.of(TestUsers.withEmail("a@test")));
        when(settings.getSettings("a@test"))
                .thenReturn(new UserSettingsResponse(9, 22, false, List.of(60), true));
        scheduler.run();
        verify(nudges, never()).getNudges(anyString());
        verify(dispatch, never()).dispatchDeadlines(any(), anyList(), anyBoolean());
    }

    @Test
    void 켠_유저는_활동시간_판정과_함께_디스패치된다() throws Exception {
        when(tokens.findDistinctUsers()).thenReturn(List.of(TestUsers.withEmail("a@test")));
        when(settings.getSettings("a@test"))
                .thenReturn(new UserSettingsResponse(9, 22, true, List.of(60), true));
        when(settings.activeHours("a@test")).thenReturn(new ActiveHours(9, 22));
        // 현재 시간 + 10시간 후 마감 = 24시간 이내, 임계값 창 밖
        when(nudges.getNudges("a@test")).thenReturn(List.of(
                nudge("550e8400-e29b-41d4-a716-446655440000", NOW.plusHours(10))
        ));
        scheduler.run();
        verify(dispatch).dispatchDeadlines(any(), anyList(), anyBoolean());
    }

    @Test
    void 한_유저의_예외가_다른_유저를_막지_않는다() throws Exception {
        when(tokens.findDistinctUsers()).thenReturn(List.of(TestUsers.withEmail("a@test"), TestUsers.withEmail("b@test")));
        when(settings.getSettings("a@test")).thenThrow(new RuntimeException("boom"));
        when(settings.getSettings("b@test"))
                .thenReturn(new UserSettingsResponse(9, 22, true, List.of(60), true));
        when(settings.activeHours("b@test")).thenReturn(new ActiveHours(9, 22));
        // 현재 시간 + 10시간 후 마감
        when(nudges.getNudges("b@test")).thenReturn(List.of(
                nudge("550e8400-e29b-41d4-a716-446655440000", NOW.plusHours(10))
        ));
        scheduler.run();
        verify(dispatch, times(1)).dispatchDeadlines(any(), anyList(), anyBoolean());
    }
}
