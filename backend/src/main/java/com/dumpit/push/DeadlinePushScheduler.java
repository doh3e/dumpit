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
import org.springframework.transaction.annotation.Transactional;

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

    @Scheduled(cron = "${app.push.deadline-cron:0 * * * * *}", zone = "Asia/Seoul")
    @Transactional(readOnly = true)
    public void run() {
        LocalDateTime now = LocalDateTime.now(ZONE);
        for (User user : deviceTokenRepository.findDistinctUsers()) {
            try {
                processUser(user, now);
            } catch (Exception e) {
                log.warn("마감 푸시 처리 실패 user={}: {}", user.getEmail(), e.getMessage());
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
