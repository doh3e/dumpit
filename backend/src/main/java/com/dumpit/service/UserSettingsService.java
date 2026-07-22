package com.dumpit.service;

import com.dumpit.common.ActiveHours;
import com.dumpit.dto.UserSettingsResponse;
import com.dumpit.dto.UserSettingsUpdateRequest;

public interface UserSettingsService {

    UserSettingsResponse getSettings(String email);

    UserSettingsResponse updateSettings(String email, UserSettingsUpdateRequest request);

    /** 설정 행이 없으면 ActiveHours.DEFAULT */
    ActiveHours activeHours(String email);
}
