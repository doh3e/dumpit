package com.dumpit.service.impl;

import com.dumpit.entity.ActivityLog;
import com.dumpit.entity.User;
import com.dumpit.repository.ActivityLogRepository;
import com.dumpit.service.ActivityLogService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityLogServiceImpl implements ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void record(User user, String action, String targetType, UUID targetId, Object before, Object after) {
        activityLogRepository.save(ActivityLog.of(
                user,
                action,
                targetType,
                targetId,
                toJson(before),
                toJson(after)
        ));
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            log.warn("Could not serialize activity log payload: {}", ex.getMessage());
            return "{}";
        }
    }
}
