package com.dumpit.service;

import com.dumpit.entity.User;
import com.dumpit.repository.ActivityLogRepository;
import com.dumpit.repository.AiUsageLogRepository;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.InquiryRepository;
import com.dumpit.repository.NoticeReadRepository;
import com.dumpit.repository.PurchaseRepository;
import com.dumpit.repository.RoutineRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserEquipmentRepository;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 탈퇴 2단계 — 유예가 끝난 계정을 콘텐츠·로그까지 완전히 파기한다.
 * <p>
 * users를 참조하는 13개 테이블 중 CASCADE는 device_tokens·user_settings 둘뿐이고
 * 나머지는 전부 NO ACTION이다. 따라서 자식 행을 먼저 지우지 않으면 users 삭제가
 * FK 위반으로 실패한다. 아래 순서 중 강제되는 것은 ideas → tasks → brain_dumps 사슬이다
 * (ideas.converted_task_id → tasks, tasks.dump_id → brain_dumps).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountPurgeService {

    private static final String ANONYMIZED_EMAIL = "withdrawn@deleted.dumpit.local";

    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final NoticeReadRepository noticeReadRepository;
    private final PurchaseRepository purchaseRepository;
    private final UserEquipmentRepository userEquipmentRepository;
    private final InquiryRepository inquiryRepository;
    private final IdeaRepository ideaRepository;
    private final TaskRepository taskRepository;
    private final BrainDumpRepository brainDumpRepository;
    private final RoutineRepository routineRepository;

    /**
     * 계정 하나를 완전히 파기한다. 유저 단위로 트랜잭션을 끊어, 한 계정이 실패해도
     * 나머지 계정 정리가 멈추지 않게 한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void purge(User user) {
        activityLogRepository.hardDeleteByUser(user);
        aiUsageLogRepository.hardDeleteByUser(user);
        noticeReadRepository.hardDeleteByUser(user);
        purchaseRepository.hardDeleteByUser(user);
        userEquipmentRepository.hardDeleteByUser(user);

        // 문의 본문은 처리 기록으로 남긴다(보관 1년, InquiryRetentionScheduler가 정리).
        // 여기서는 계정과의 연결만 끊는다 — user_id가 nullable이라 가능하다.
        inquiryRepository.unlinkUser(user, ANONYMIZED_EMAIL);

        ideaRepository.hardDeleteByUser(user);
        taskRepository.hardDeleteByUser(user);
        brainDumpRepository.hardDeleteByUser(user);
        routineRepository.hardDeleteByUser(user);

        // device_tokens·user_settings는 users 삭제 시 CASCADE로 함께 사라진다
        userRepository.delete(user);
        log.info("Purged withdrawn account after grace period: userId={}", user.getUserId());
    }
}
