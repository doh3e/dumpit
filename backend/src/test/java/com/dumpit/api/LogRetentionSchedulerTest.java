package com.dumpit.api;

import com.dumpit.entity.Inquiry;
import com.dumpit.repository.ActivityLogRepository;
import com.dumpit.repository.InquiryRepository;
import com.dumpit.service.ActivityLogService;
import com.dumpit.service.LogRetentionScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 개인정보처리방침이 고지한 보관 기간이 실제로 집행되는지 검증한다.
 * 예전 구현은 소유자의 withdrawnAt을 기준으로 삼아 활성 회원 로그가 영구 보존됐다.
 */
class LogRetentionSchedulerTest extends ApiIntegrationTestBase {

    @Autowired private LogRetentionScheduler logRetentionScheduler;
    @Autowired private ActivityLogRepository activityLogRepository;
    @Autowired private ActivityLogService activityLogService;
    @Autowired private InquiryRepository inquiryRepository;

    @Test
    void 활성_회원의_오래된_활동로그도_보관기간이_지나면_삭제된다() {
        activityLogService.record(userA, "TASK_CREATED", "TASK", userA.getUserId(),
                Map.of(), Map.of());
        ageAllActivityLogs(120);

        logRetentionScheduler.purgeExpiredLogs();

        assertThat(activityLogRepository.count()).isZero();
    }

    @Test
    void 보관기간_안의_활동로그는_남는다() {
        activityLogService.record(userA, "TASK_CREATED", "TASK", userA.getUserId(),
                Map.of(), Map.of());
        ageAllActivityLogs(10);

        logRetentionScheduler.purgeExpiredLogs();

        assertThat(activityLogRepository.count()).isEqualTo(1);
    }

    @Test
    void 처리된지_1년_넘은_문의는_삭제된다() {
        Inquiry old = inquiryRepository.save(Inquiry.of(userA, USER_A, "오래된 문의", "본문"));
        Inquiry recent = inquiryRepository.save(Inquiry.of(userA, USER_A, "최근 문의", "본문"));
        setInquiryRepliedAt(old, LocalDateTime.now().minusDays(400));
        setInquiryRepliedAt(recent, LocalDateTime.now().minusDays(10));

        logRetentionScheduler.purgeExpiredLogs();

        assertThat(inquiryRepository.findAll())
                .extracting(Inquiry::getSubject)
                .containsExactly("최근 문의");
    }

    private void ageAllActivityLogs(int days) {
        jdbcTemplate.update("UPDATE activity_logs SET created_at = ?",
                LocalDateTime.now().minusDays(days));
    }

    private void setInquiryRepliedAt(Inquiry inquiry, LocalDateTime repliedAt) {
        jdbcTemplate.update("UPDATE inquiries SET replied_at = ?, created_at = ? WHERE inquiry_id = ?",
                repliedAt, repliedAt, inquiry.getInquiryId());
    }
}
