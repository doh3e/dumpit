package com.dumpit.service;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** 유예가 끝난 탈퇴 계정을 매일 새벽에 완전 파기한다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountPurgeScheduler {

    private final UserRepository userRepository;
    private final AccountPurgeService accountPurgeService;

    // 조회만 트랜잭션으로 묶고, 실제 삭제는 AccountPurgeService가 계정별 새 트랜잭션에서 수행한다.
    @Transactional(readOnly = true)
    @Scheduled(cron = "${app.retention.account-purge-cron:0 0 4 * * *}", zone = "Asia/Seoul")
    public void purgeExpiredAccounts() {
        List<User> due = userRepository.findPurgeDue(LocalDateTime.now());
        if (due.isEmpty()) return;

        int purged = 0;
        for (User user : due) {
            try {
                accountPurgeService.purge(user);
                purged++;
            } catch (RuntimeException e) {
                // 한 계정이 실패해도 나머지는 계속 정리한다 — 실패분은 다음 날 다시 시도된다
                log.error("Failed to purge withdrawn account: userId={}", user.getUserId(), e);
            }
        }
        log.info("Account purge finished: due={}, purged={}", due.size(), purged);
    }
}
