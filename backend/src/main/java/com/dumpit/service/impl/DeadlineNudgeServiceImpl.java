package com.dumpit.service.impl;

import com.dumpit.dto.DeadlineNudgeResponse;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.DeadlineNudgeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeadlineNudgeServiceImpl implements DeadlineNudgeService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    private static final int MAX_NUDGES = 20;

    private final StringRedisTemplate redisTemplate;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Override
    public void index(Task task) {
        if (!shouldIndex(task)) {
            remove(task);
            return;
        }

        try {
            redisTemplate.opsForZSet().add(key(task.getUser()), task.getTaskId().toString(), toEpochMillis(task.getDeadline()));
        } catch (DataAccessException ex) {
            log.debug("Skipping deadline nudge Redis index because Redis is unavailable", ex);
        }
    }

    @Override
    public void remove(Task task) {
        try {
            redisTemplate.opsForZSet().remove(key(task.getUser()), task.getTaskId().toString());
        } catch (DataAccessException ex) {
            log.debug("Skipping deadline nudge Redis removal because Redis is unavailable", ex);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeadlineNudgeResponse> getNudges(String email) {
        User user = findUser(email);
        LocalDateTime now = LocalDateTime.now(ZONE);
        LocalDateTime cutoff = now.plusDays(1);

        syncUserOnce(user);

        List<Task> tasks = getFromRedis(user, cutoff);
        if (tasks.isEmpty()) {
            tasks = getFromDatabase(user, cutoff);
            tasks.forEach(this::index);
        }

        return tasks.stream()
                .filter(this::shouldIndex)
                .filter(task -> !task.getDeadline().isAfter(cutoff))
                .limit(MAX_NUDGES)
                .map(task -> DeadlineNudgeResponse.from(task, now))
                .toList();
    }

    private List<Task> getFromRedis(User user, LocalDateTime cutoff) {
        try {
            var ids = redisTemplate.opsForZSet()
                    .rangeByScore(key(user), Double.NEGATIVE_INFINITY, toEpochMillis(cutoff), 0, MAX_NUDGES);
            if (ids == null || ids.isEmpty()) return List.of();

            List<UUID> taskIds = ids.stream()
                    .map(this::parseUuid)
                    .filter(uuid -> uuid != null)
                    .toList();
            Map<UUID, Task> byId = new LinkedHashMap<>();
            taskRepository.findAllById(taskIds).forEach(task -> byId.put(task.getTaskId(), task));

            List<Task> tasks = new ArrayList<>();
            for (UUID taskId : taskIds) {
                Task task = byId.get(taskId);
                if (task == null || !task.getUser().getUserId().equals(user.getUserId()) || !shouldIndex(task)) {
                    redisTemplate.opsForZSet().remove(key(user), taskId.toString());
                    continue;
                }
                if (!task.getDeadline().isAfter(cutoff)) tasks.add(task);
            }

            return tasks;
        } catch (DataAccessException ex) {
            log.debug("Falling back to database for deadline nudges because Redis is unavailable", ex);
            return List.of();
        }
    }

    private List<Task> getFromDatabase(User user, LocalDateTime cutoff) {
        return taskRepository.findDeadlineNudges(user, cutoff);
    }

    private void syncUserOnce(User user) {
        try {
            String markerKey = syncKey(user);
            Boolean alreadySynced = redisTemplate.hasKey(markerKey);
            if (Boolean.TRUE.equals(alreadySynced)) return;

            taskRepository.findDeadlineIndexCandidates(user).forEach(this::index);
            redisTemplate.opsForValue().set(markerKey, "1");
        } catch (DataAccessException ex) {
            log.debug("Skipping initial deadline nudge Redis sync because Redis is unavailable", ex);
        }
    }

    private boolean shouldIndex(Task task) {
        return task.getDeadline() != null
                && task.getStatus() != Task.Status.DONE
                && task.getStatus() != Task.Status.CANCELLED;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
    }

    private String key(User user) {
        return "deadline:nudges:user:" + user.getUserId();
    }

    private String syncKey(User user) {
        return "deadline:nudges:synced:user:" + user.getUserId();
    }

    private double toEpochMillis(LocalDateTime value) {
        return value.atZone(ZONE).toInstant().toEpochMilli();
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
