package com.dumpit.service.impl;

import com.dumpit.common.ActiveHours;
import com.dumpit.dto.UserSettingsResponse;
import com.dumpit.dto.UserSettingsUpdateRequest;
import com.dumpit.entity.User;
import com.dumpit.entity.UserSettings;
import com.dumpit.exception.BadRequestException;
import com.dumpit.repository.UserRepository;
import com.dumpit.repository.UserSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserSettingsServiceImplTest {

    private static final String EMAIL = "user@test.com";

    private final UserSettingsRepository userSettingsRepository = mock(UserSettingsRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserSettingsServiceImpl service =
            new UserSettingsServiceImpl(userSettingsRepository, userRepository);
    private final User user = User.of(EMAIL, "tester", "google", "pid");

    @BeforeEach
    void setUp() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(userSettingsRepository.save(any(UserSettings.class)))
                .thenAnswer((invocation) -> invocation.getArgument(0));
    }

    @Test
    void 설정_행이_없으면_기본값을_응답한다() {
        when(userSettingsRepository.findByUserEmail(EMAIL)).thenReturn(Optional.empty());

        UserSettingsResponse res = service.getSettings(EMAIL);

        assertThat(res).isEqualTo(UserSettingsResponse.DEFAULTS);
    }

    @Test
    void 첫_저장은_행을_만들고_부분_갱신한다() {
        when(userSettingsRepository.findById(any())).thenReturn(Optional.empty());

        UserSettingsResponse res = service.updateSettings(EMAIL,
                new UserSettingsUpdateRequest(22, 2, null, null));

        assertThat(res.routineStartHour()).isEqualTo(22);
        assertThat(res.routineEndHour()).isEqualTo(2);
        assertThat(res.notificationsEnabled()).isTrue();
        assertThat(res.notificationThresholds()).containsExactly(60);
    }

    @Test
    void 시작과_종료가_같으면_거부한다() {
        when(userSettingsRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateSettings(EMAIL,
                new UserSettingsUpdateRequest(9, 9, null, null)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void 한쪽만_바꿔서_시작과_종료가_같아져도_거부한다() {
        UserSettings existing = UserSettings.of(user); // 기본 9~22
        when(userSettingsRepository.findById(any())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateSettings(EMAIL,
                new UserSettingsUpdateRequest(22, null, null, null)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void 허용되지_않은_알림_시점은_거부하고_허용값은_중복제거_내림차순_정렬한다() {
        when(userSettingsRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateSettings(EMAIL,
                new UserSettingsUpdateRequest(null, null, null, List.of(45))))
                .isInstanceOf(BadRequestException.class);

        UserSettingsResponse res = service.updateSettings(EMAIL,
                new UserSettingsUpdateRequest(null, null, null, List.of(30, 720, 30)));
        assertThat(res.notificationThresholds()).containsExactly(720, 30);
    }

    @Test
    void 빈_알림_시점_배열은_허용한다() {
        when(userSettingsRepository.findById(any())).thenReturn(Optional.empty());

        UserSettingsResponse res = service.updateSettings(EMAIL,
                new UserSettingsUpdateRequest(null, null, null, List.of()));

        assertThat(res.notificationThresholds()).isEmpty();
    }

    @Test
    void activeHours는_행이_없으면_기본값_있으면_저장값이다() {
        when(userSettingsRepository.findByUserEmail(EMAIL)).thenReturn(Optional.empty());
        assertThat(service.activeHours(EMAIL)).isEqualTo(ActiveHours.DEFAULT);

        UserSettings settings = UserSettings.of(user);
        settings.updateRoutineHours(22, 6);
        when(userSettingsRepository.findByUserEmail(EMAIL)).thenReturn(Optional.of(settings));
        assertThat(service.activeHours(EMAIL)).isEqualTo(new ActiveHours(22, 6));
    }
}
