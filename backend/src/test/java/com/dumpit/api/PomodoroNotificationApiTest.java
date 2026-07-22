package com.dumpit.api;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PomodoroNotificationApiTest extends ApiIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;

    private Task seedTask(User user, String title, LocalDateTime deadline) {
        Task task = Task.of(user, title, null, deadline, 30);
        return taskRepository.save(task);
    }

    // ---------- POST /pomodoro/start · /pomodoro/complete ----------
    // 세션 검증 설계: docs/superpowers/specs/2026-07-14-coin-anti-farming-design.md

    /** 시작 기록을 과거로 되돌려 실제 경과시간을 재현 */
    private void backdatePomodoroStart(String email, int minutesAgo) {
        jdbcTemplate.update("UPDATE users SET pomodoro_started_at = ? WHERE email = ?",
                LocalDateTime.now().minusMinutes(minutesAgo), email);
    }

    @Test
    void 시작_200() throws Exception {
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A)))
                .andExpect(status().isOk());
    }

    @Test
    void 시작_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/pomodoro/start"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 완료_경과충족이면_코인지급_같은세션_재청구는_0코인() throws Exception {
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A)))
                .andExpect(status().isOk());
        backdatePomodoroStart(USER_A, 26);

        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5))
                .andExpect(jsonPath("$.totalCoins").value(5));

        // 세션은 완료로 소거 — 같은 시작 기록으로 반복 청구 불가
        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0))
                .andExpect(jsonPath("$.totalCoins").value(5));

        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5));
    }

    @Test
    void 완료_검증통과시_누적집중_증가() throws Exception {
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A)))
                .andExpect(status().isOk());
        backdatePomodoroStart(USER_A, 26);

        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/me/stats").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pomodoroTotalMinutes").value(25))
                .andExpect(jsonPath("$.pomodoroTotalSessions").value(1));

        // 세션 소거 후 재청구는 코인처럼 통계도 안 쌓인다
        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/me/stats").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pomodoroTotalMinutes").value(25))
                .andExpect(jsonPath("$.pomodoroTotalSessions").value(1));
    }

    @Test
    void 완료_경과부족이면_누적집중_안쌓임() throws Exception {
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/me/stats").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pomodoroTotalMinutes").value(0))
                .andExpect(jsonPath("$.pomodoroTotalSessions").value(0));
    }

    @Test
    void 완료_시작기록_없으면_0코인() throws Exception {
        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0))
                .andExpect(jsonPath("$.totalCoins").value(0));
    }

    @Test
    void 완료_경과부족이면_0코인() throws Exception {
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A)))
                .andExpect(status().isOk());

        // 시작 직후 완료 요청 — 25분 세션인데 경과 0분
        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0));
    }

    @Test
    void 완료_1분세션도_즉시완료는_통과못함() throws Exception {
        // 고정 관용치 60초였다면 1분 세션의 요구 경과시간이 0이 되는 회귀 방지
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0));
    }

    @Test
    void 완료_body없으면_기본25분으로_검증() throws Exception {
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A)))
                .andExpect(status().isOk());
        backdatePomodoroStart(USER_A, 26);

        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5))
                .andExpect(jsonPath("$.totalCoins").value(5));
    }

    @Test
    void 완료_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/pomodoro/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 완료_잘못된_JSON본문이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{이건 JSON이 아님"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /notifications/deadline-nudges ----------

    @Test
    void 넛지_마감임박태스크만_반환_Redis없이_degrade() throws Exception {
        Task soon = seedTask(userA, "곧 마감", LocalDateTime.now().plusHours(3));
        seedTask(userA, "먼 마감", LocalDateTime.now().plusDays(10));
        seedTask(userB, "B의 임박 태스크", LocalDateTime.now().plusHours(1));

        mockMvc.perform(get("/notifications/deadline-nudges").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].taskId").value(soon.getTaskId().toString()))
                .andExpect(jsonPath("$[0].title").value("곧 마감"))
                .andExpect(jsonPath("$[0].remainingMinutes").exists())
                .andExpect(jsonPath("$[0].overdue").value(false));
    }

    @Test
    void 넛지_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/notifications/deadline-nudges"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }
}
