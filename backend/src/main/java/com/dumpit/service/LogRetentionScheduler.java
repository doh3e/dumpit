package com.dumpit.service;

import com.dumpit.repository.ActivityLogRepository;
import com.dumpit.repository.AiUsageLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class LogRetentionScheduler {

    private final ActivityLogRepository activityLogRepository;
    private final AiUsageLogRepository aiUsageLogRepository;

    @Value("${app.retention.withdrawn-activity-log-days:90}")
    private long withdrawnActivityLogRetentionDays;

    @Value("${app.retention.withdrawn-ai-usage-log-days:180}")
    private long withdrawnAiUsageLogRetentionDays;

    @Transactional
    @Scheduled(cron = "${app.retention.cleanup-cron:0 30 3 * * *}", zone = "Asia/Seoul")
    public void purgeExpiredLogs() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime activityCutoff = now.minusDays(withdrawnActivityLogRetentionDays);
        LocalDateTime aiUsageCutoff = now.minusDays(withdrawnAiUsageLogRetentionDays);

        long activityDeleted = activityLogRepository.deleteWithdrawnUserLogsBefore(activityCutoff);
        long aiUsageDeleted = aiUsageLogRepository.deleteWithdrawnUserLogsBefore(aiUsageCutoff);

        if (activityDeleted > 0 || aiUsageDeleted > 0) {
            log.info("Purged expired logs: activityLogs={}, aiUsageLogs={}", activityDeleted, aiUsageDeleted);
        }
    }
}
