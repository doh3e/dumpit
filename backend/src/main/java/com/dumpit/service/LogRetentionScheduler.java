package com.dumpit.service;

import com.dumpit.repository.ActivityLogRepository;
import com.dumpit.repository.AiUsageLogRepository;
import com.dumpit.repository.InquiryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 개인정보처리방침이 고지한 보관 기간을 실제로 집행한다.
 * <p>
 * 기준은 각 기록 자신의 생성 시각이다. 예전에는 소유자의 {@code withdrawnAt}을 기준으로 삼아,
 * 그 값이 NULL인 활성 회원의 로그가 영구 보존되고 있었다. 탈퇴 회원의 기록은 유예 종료 시
 * {@code AccountPurgeService}가 계정과 함께 통째로 지운다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogRetentionScheduler {

    private final ActivityLogRepository activityLogRepository;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final InquiryRepository inquiryRepository;

    @Value("${app.retention.activity-log-days:90}")
    private long activityLogRetentionDays;

    @Value("${app.retention.ai-usage-log-days:180}")
    private long aiUsageLogRetentionDays;

    @Value("${app.retention.inquiry-days:365}")
    private long inquiryRetentionDays;

    @Transactional
    @Scheduled(cron = "${app.retention.cleanup-cron:0 30 3 * * *}", zone = "Asia/Seoul")
    public void purgeExpiredLogs() {
        LocalDateTime now = LocalDateTime.now();

        long activityDeleted = activityLogRepository
                .deleteLogsCreatedBefore(now.minusDays(activityLogRetentionDays));
        long aiUsageDeleted = aiUsageLogRepository
                .deleteLogsCreatedBefore(now.minusDays(aiUsageLogRetentionDays));
        long inquiriesDeleted = inquiryRepository
                .deleteProcessedBefore(now.minusDays(inquiryRetentionDays));

        if (activityDeleted > 0 || aiUsageDeleted > 0 || inquiriesDeleted > 0) {
            log.info("Purged expired records: activityLogs={}, aiUsageLogs={}, inquiries={}",
                    activityDeleted, aiUsageDeleted, inquiriesDeleted);
        }
    }
}
