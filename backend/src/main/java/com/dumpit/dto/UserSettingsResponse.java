package com.dumpit.dto;

import com.dumpit.entity.UserSettings;

import java.util.List;

public record UserSettingsResponse(
        int routineStartHour,
        int routineEndHour,
        boolean notificationsEnabled,
        boolean briefingEnabled,
        List<Integer> notificationThresholds
) {
    public static final UserSettingsResponse DEFAULTS =
            new UserSettingsResponse(9, 22, true, true, List.of(60));

    public static UserSettingsResponse from(UserSettings settings) {
        return new UserSettingsResponse(
                settings.getRoutineStartHour(),
                settings.getRoutineEndHour(),
                settings.getNotificationsEnabled(),
                settings.getBriefingEnabled(),
                settings.getNotificationThresholds()
        );
    }
}
