package com.dumpit.dto;

import java.util.List;

/** PATCH /me/settings — null 필드는 변경하지 않는다 */
public record UserSettingsUpdateRequest(
        Integer routineStartHour,
        Integer routineEndHour,
        Boolean notificationsEnabled,
        List<Integer> notificationThresholds
) {}
