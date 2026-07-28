package com.dumpit.push;

import com.dumpit.entity.DeviceToken;
import com.dumpit.entity.User;
import com.dumpit.repository.DeviceTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PushDispatchServiceTest {

    StringRedisTemplate redis = mock(StringRedisTemplate.class);
    ValueOperations<String, String> valueOps = mock(ValueOperations.class);
    ListOperations<String, String> listOps = mock(ListOperations.class);
    DeviceTokenRepository tokens = mock(DeviceTokenRepository.class);
    PushSender sender = mock(PushSender.class);
    PushDispatchService service;
    User user;

    @BeforeEach
    void setUp() throws Exception {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(redis.opsForList()).thenReturn(listOps);
        service = new PushDispatchService(redis, tokens, sender);
        user = TestUsers.withEmail("test@example.com");
        when(tokens.findAllByUser(user)).thenReturn(List.of(DeviceToken.of(user, "tok-1", "android")));
        when(sender.send(anyString(), any())).thenReturn(PushSender.SendResult.OK);
    }

    private DeadlinePushPlanner.Candidate candidate(String key) {
        return new DeadlinePushPlanner.Candidate(key, "제목", "본문");
    }

    @Test
    void 처음_보는_키만_발송한다() {
        when(valueOps.setIfAbsent(contains("k1"), anyString(), any(Duration.class))).thenReturn(true);
        when(valueOps.setIfAbsent(contains("k2"), anyString(), any(Duration.class))).thenReturn(false);
        service.dispatchDeadlines(user, List.of(candidate("k1"), candidate("k2")), false);
        verify(sender, times(1)).send(eq("tok-1"), any());
    }

    @Test
    void 방해금지면_발송_대신_보류에_적재한다() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        service.dispatchDeadlines(user, List.of(candidate("k1")), true);
        verify(sender, never()).send(anyString(), any());
        verify(listOps).leftPush(startsWith("push:held:"), anyString());
    }

    @Test
    void 분당_5건_상한을_넘는_후보는_dedup을_심지_않고_스킵한다() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        var many = List.of(candidate("k1"), candidate("k2"), candidate("k3"),
                candidate("k4"), candidate("k5"), candidate("k6"));
        service.dispatchDeadlines(user, many, false);
        verify(sender, times(5)).send(anyString(), any());
        verify(valueOps, times(5)).setIfAbsent(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void 레디스가_죽어_있으면_발송하지_않는다() {   // 스팸 방지 — dedup 보장 불가 시 침묵
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenThrow(new QueryTimeoutException("redis down"));
        service.dispatchDeadlines(user, List.of(candidate("k1")), false);
        verify(sender, never()).send(anyString(), any());
    }

    @Test
    void 무효_토큰은_삭제한다() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        when(sender.send(eq("tok-1"), any())).thenReturn(PushSender.SendResult.INVALID_TOKEN);
        service.dispatchDeadlines(user, List.of(candidate("k1")), false);
        verify(tokens).deleteAll(argThat(iter -> iter.iterator().hasNext()));
    }
}
