package com.dumpit.service;

import com.dumpit.entity.User;

import java.util.UUID;

public interface ActivityLogService {

    void record(User user, String action, String targetType, UUID targetId, Object before, Object after);
}
