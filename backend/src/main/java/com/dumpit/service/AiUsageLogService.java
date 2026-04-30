package com.dumpit.service;

import com.dumpit.entity.User;

public interface AiUsageLogService {

    void record(User user, AiUsageService.UsageType usageType, int usedAfter, boolean allowed, String note);
}
