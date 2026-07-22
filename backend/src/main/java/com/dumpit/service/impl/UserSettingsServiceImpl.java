package com.dumpit.service.impl;

import com.dumpit.common.ActiveHours;
import com.dumpit.dto.UserSettingsResponse;
import com.dumpit.dto.UserSettingsUpdateRequest;
import com.dumpit.entity.User;
import com.dumpit.entity.UserSettings;
import com.dumpit.exception.BadRequestException;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.UserRepository;
import com.dumpit.repository.UserSettingsRepository;
import com.dumpit.service.UserSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserSettingsServiceImpl implements UserSettingsService {

    static final Set<Integer> ALLOWED_THRESHOLDS = Set.of(720, 360, 180, 60, 30, 10);

    private final UserSettingsRepository userSettingsRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserSettingsResponse getSettings(String email) {
        return userSettingsRepository.findByUserEmail(email)
                .map(UserSettingsResponse::from)
                .orElse(UserSettingsResponse.DEFAULTS);
    }

    @Override
    @Transactional
    public UserSettingsResponse updateSettings(String email, UserSettingsUpdateRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
        UserSettings settings = userSettingsRepository.findById(user.getUserId())
                .orElseGet(() -> UserSettings.of(user));

        int start = request.routineStartHour() != null ? request.routineStartHour() : settings.getRoutineStartHour();
        int end = request.routineEndHour() != null ? request.routineEndHour() : settings.getRoutineEndHour();
        validateHours(start, end);
        settings.updateRoutineHours(start, end);

        if (request.notificationsEnabled() != null) {
            settings.updateNotificationsEnabled(request.notificationsEnabled());
        }
        if (request.notificationThresholds() != null) {
            settings.updateNotificationThresholds(normalizeThresholds(request.notificationThresholds()));
        }
        return UserSettingsResponse.from(userSettingsRepository.save(settings));
    }

    @Override
    @Transactional(readOnly = true)
    public ActiveHours activeHours(String email) {
        return userSettingsRepository.findByUserEmail(email)
                .map((settings) -> new ActiveHours(settings.getRoutineStartHour(), settings.getRoutineEndHour()))
                .orElse(ActiveHours.DEFAULT);
    }

    private void validateHours(int start, int end) {
        if (start < 0 || start > 23 || end < 0 || end > 23) {
            throw new BadRequestException("일과 시간은 0시부터 23시 사이로 설정해주세요.");
        }
        if (start == end) {
            throw new BadRequestException("일과 시작과 종료 시각은 서로 달라야 해요.");
        }
    }

    private List<Integer> normalizeThresholds(List<Integer> raw) {
        List<Integer> distinct = raw.stream().distinct().toList();
        for (Integer minutes : distinct) {
            if (minutes == null || !ALLOWED_THRESHOLDS.contains(minutes)) {
                throw new BadRequestException("지원하지 않는 알림 시점이에요.");
            }
        }
        return distinct.stream().sorted(Comparator.reverseOrder()).toList();
    }
}
