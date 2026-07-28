package com.dumpit.push;

import com.dumpit.dto.UserSettingsResponse;
import com.dumpit.entity.User;
import com.dumpit.repository.DeviceTokenRepository;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.TaskPlanningService;
import com.dumpit.service.UserSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Slf4j
@Component
@RequiredArgsConstructor
public class BriefingScheduler {

    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    static final String CHANNEL_BRIEFING = "push-briefing";

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserSettingsService userSettingsService;
    private final TaskPlanningService taskPlanningService;
    private final DeadlineNudgeService deadlineNudgeService;
    private final PushDispatchService pushDispatchService;
    private final StringRedisTemplate redisTemplate;

    @Scheduled(cron = "${app.push.briefing-cron:0 0 * * * *}", zone = "Asia/Seoul")
    @Transactional(readOnly = true)
    public void run() {
        runAt(LocalDateTime.now(ZONE));
    }

    void runAt(LocalDateTime now) {
        for (User user : deviceTokenRepository.findDistinctUsers()) {
            try {
                processUser(user, now);
            } catch (Exception e) {
                log.warn("브리핑 처리 실패 user={}: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    private void processUser(User user, LocalDateTime now) {
        String email = user.getEmail();
        UserSettingsResponse settings = userSettingsService.getSettings(email);
        if (settings.routineStartHour() != now.getHour()) return;
        if (!settings.notificationsEnabled()) return;

        if (!settings.briefingEnabled()) {
            pushDispatchService.drainHeldCount(user);   // 브리핑 없이 보류분 소멸(스펙 결정 3)
            return;
        }
        if (!tryMarkSentToday(user, now)) return;

        long today = taskPlanningService.todayTasks(email).size();
        long dueSoon = deadlineNudgeService.getNudges(email).size();
        long held = pushDispatchService.drainHeldCount(user);
        if (today == 0 && dueSoon == 0 && held == 0) return;

        String body = "오늘 할 일 " + today + "개 · 24시간 내 마감 " + dueSoon + "개"
                + (held > 0 ? " · 밤사이 알림 " + held + "건" : "");
        pushDispatchService.sendToUserDevices(user,
                new PushSender.PushMessage("좋은 아침이에요!", body, CHANNEL_BRIEFING, "home"));
    }

    private boolean tryMarkSentToday(User user, LocalDateTime now) {
        try {
            Boolean ok = redisTemplate.opsForValue().setIfAbsent(
                    "push:briefing:" + user.getUserId() + ":" + now.toLocalDate(), "1", Duration.ofHours(25));
            return Boolean.TRUE.equals(ok);
        } catch (DataAccessException ex) {
            log.debug("브리핑 dedup 실패(Redis 없음) — 스킵: {}", ex.getMessage());
            return false;
        }
    }
}
