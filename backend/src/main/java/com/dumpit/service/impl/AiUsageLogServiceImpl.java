package com.dumpit.service.impl;

import com.dumpit.entity.AiUsageLog;
import com.dumpit.entity.User;
import com.dumpit.repository.AiUsageLogRepository;
import com.dumpit.service.AiUsageLogService;
import com.dumpit.service.AiUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiUsageLogServiceImpl implements AiUsageLogService {

    private final AiUsageLogRepository aiUsageLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(User user, AiUsageService.UsageType usageType, int usedAfter, boolean allowed, String note) {
        int normalized = Math.max(0, usedAfter);
        aiUsageLogRepository.save(AiUsageLog.of(
                user,
                usageType.name(),
                usageType.cost(),
                normalized,
                AiUsageService.DAILY_LIMIT,
                Math.max(0, AiUsageService.DAILY_LIMIT - normalized),
                allowed,
                note
        ));
    }
}
