package com.dumpit.push;

import com.dumpit.dto.DeadlineNudgeResponse;
import com.dumpit.dto.UserSettingsResponse;
import com.dumpit.entity.User;
import com.dumpit.repository.DeviceTokenRepository;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.UserSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeadlinePushScheduler {

    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserSettingsService userSettingsService;
    private final DeadlineNudgeService deadlineNudgeService;
    private final PushDispatchService pushDispatchService;

    // readOnly 트랜잭션을 걸면 하위 무효 토큰 deleteAll이 무플러시로 증발한다 — 하위 호출은 각자 트랜잭션을 가진다
    @Scheduled(cron = "${app.push.deadline-cron:0 * * * * *}", zone = "Asia/Seoul")
    public void run() {
        runAt(LocalDateTime.now(ZONE));
    }

    void runAt(LocalDateTime now) {
        for (User user : deviceTokenRepository.findDistinctUsers()) {
            try {
                processUser(user, now);
            } catch (Exception e) {
                log.warn("마감 푸시 처리 실패 userId={}: {}", user.getUserId(), e.getMessage());
            }
        }
    }

    private void processUser(User user, LocalDateTime now) {
        String email = user.getEmail();
        UserSettingsResponse settings = userSettingsService.getSettings(email);
        if (!settings.notificationsEnabled()) return;

        List<DeadlineNudgeResponse> nudges = deadlineNudgeService.getNudges(email);
        List<DeadlinePushPlanner.DueTask> tasks = nudges.stream()
                .map(n -> new DeadlinePushPlanner.DueTask(
                        String.valueOf(n.taskId()), n.title(), n.deadline()))
                .toList();

        var candidates = DeadlinePushPlanner.plan(tasks, settings.notificationThresholds(), now);
        if (candidates.isEmpty()) return;

        boolean quiet = !userSettingsService.activeHours(email).contains(now.getHour());
        pushDispatchService.dispatchDeadlines(user, candidates, quiet);
    }
}
