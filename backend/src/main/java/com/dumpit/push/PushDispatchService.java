package com.dumpit.push;

import com.dumpit.entity.DeviceToken;
import com.dumpit.entity.User;
import com.dumpit.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushDispatchService {

    static final int MAX_PER_MINUTE = 5;          // 웹 1배치 상한 미러
    static final String CHANNEL_DEADLINE = "push-deadline";
    static final Duration SENT_TTL = Duration.ofHours(25);
    static final Duration HELD_TTL = Duration.ofHours(48);

    private final StringRedisTemplate redisTemplate;
    private final DeviceTokenRepository deviceTokenRepository;
    private final PushSender pushSender;

    public void dispatchDeadlines(User user, List<DeadlinePushPlanner.Candidate> candidates, boolean quiet) {
        int handled = 0;
        for (DeadlinePushPlanner.Candidate c : candidates) {
            if (handled >= MAX_PER_MINUTE) break;   // 잘린 건 dedup 미기록 → 다음 분 재도래
            if (!trySetSent(user, c.dedupKey())) continue;
            if (quiet) {
                hold(user, c);
            } else {
                sendToUserDevices(user, new PushSender.PushMessage(c.title(), c.body(), CHANNEL_DEADLINE, "home"));
            }
            handled++;
        }
    }

    public void sendToUserDevices(User user, PushSender.PushMessage message) {
        List<DeviceToken> invalid = new ArrayList<>();
        for (DeviceToken device : deviceTokenRepository.findAllByUser(user)) {
            PushSender.SendResult result = pushSender.send(device.getToken(), message);
            if (result == PushSender.SendResult.INVALID_TOKEN) invalid.add(device);
        }
        if (!invalid.isEmpty()) deviceTokenRepository.deleteAll(invalid);
    }

    public long drainHeldCount(User user) {
        try {
            String key = heldKey(user);
            Long size = redisTemplate.opsForList().size(key);
            redisTemplate.delete(key);
            return size == null ? 0 : size;
        } catch (DataAccessException ex) {
            log.debug("보류 목록 조회 실패(Redis 없음): {}", ex.getMessage());
            return 0;
        }
    }

    /** dedup 확보 실패(이미 발송·Redis 다운) 시 false — 다운 시 침묵이 스팸보다 낫다 */
    private boolean trySetSent(User user, String dedupKey) {
        try {
            Boolean ok = redisTemplate.opsForValue()
                    .setIfAbsent("push:sent:" + user.getUserId() + ":" + dedupKey, "1", SENT_TTL);
            return Boolean.TRUE.equals(ok);
        } catch (DataAccessException ex) {
            log.debug("푸시 dedup 실패(Redis 없음) — 발송 스킵: {}", ex.getMessage());
            return false;
        }
    }

    private void hold(User user, DeadlinePushPlanner.Candidate c) {
        try {
            String key = heldKey(user);
            redisTemplate.opsForList().leftPush(key, c.body());
            redisTemplate.expire(key, HELD_TTL);
        } catch (DataAccessException ex) {
            log.debug("푸시 보류 적재 실패(Redis 없음): {}", ex.getMessage());
        }
    }

    private String heldKey(User user) {
        return "push:held:" + user.getUserId();
    }
}
