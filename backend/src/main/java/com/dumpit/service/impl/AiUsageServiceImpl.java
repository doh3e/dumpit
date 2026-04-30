package com.dumpit.service.impl;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.AiUsageLimitExceededException;
import com.dumpit.service.AiUsageLogService;
import com.dumpit.service.AiUsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiUsageServiceImpl implements AiUsageService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;
    private final AiUsageLogService aiUsageLogService;

    @Override
    public AiUsageStatus getStatus(String email) {
        User user = findUser(email);
        int used = readUsed(key(user));
        return status(used);
    }

    @Override
    public AiUsageStatus consume(String email, UsageType usageType) {
        User user = findUser(email);
        String key = key(user);

        try {
            Long used = redisTemplate.opsForValue().increment(key, usageType.cost());
            if (used == null) return status(0);
            redisTemplate.expire(key, ttlUntilReset());

            if (used > DAILY_LIMIT) {
                redisTemplate.opsForValue().decrement(key, usageType.cost());
                recordUsage(user, usageType, DAILY_LIMIT, false, "LIMIT_EXCEEDED");
                throw new AiUsageLimitExceededException();
            }

            recordUsage(user, usageType, used.intValue(), true, null);
            return status(used.intValue());
        } catch (AiUsageLimitExceededException ex) {
            throw ex;
        } catch (DataAccessException ex) {
            log.warn("Allowing AI request because Redis usage limiter is unavailable: {}", ex.getMessage());
            recordUsage(user, usageType, 0, true, "REDIS_UNAVAILABLE");
            return status(0);
        }
    }

    private int readUsed(String key) {
        try {
            String value = redisTemplate.opsForValue().get(key);
            if (value == null || value.isBlank()) return 0;
            return Integer.parseInt(value);
        } catch (DataAccessException | NumberFormatException ex) {
            log.warn("Could not read AI usage. Treating as zero: {}", ex.getMessage());
            return 0;
        }
    }

    private AiUsageStatus status(int used) {
        int normalized = Math.max(0, used);
        return new AiUsageStatus(
                normalized,
                DAILY_LIMIT,
                Math.max(0, DAILY_LIMIT - normalized),
                resetAt()
        );
    }

    private String key(User user) {
        LocalDate today = LocalDate.now(ZONE);
        return "ai:usage:user:" + user.getUserId() + ":" + today.format(KEY_DATE);
    }

    private OffsetDateTime resetAt() {
        return LocalDate.now(ZONE).plusDays(1).atStartOfDay(ZONE).toOffsetDateTime();
    }

    private Duration ttlUntilReset() {
        return Duration.between(OffsetDateTime.now(ZONE), resetAt()).plusMinutes(5);
    }

    private void recordUsage(User user, UsageType usageType, int usedAfter, boolean allowed, String note) {
        aiUsageLogService.record(user, usageType, usedAfter, allowed, note);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없어요."));
    }
}
