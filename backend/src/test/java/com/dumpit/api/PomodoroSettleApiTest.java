package com.dumpit.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * settle 설계: docs/superpowers/specs/2026-07-24-pomodoro-settle-priority-policy-design.md
 * 서버 벽시계 상한(settleableCap) + 델타 지급 — 언제 몇 번 호출해도 중복 지급이 없어야 한다.
 */
class PomodoroSettleApiTest extends ApiIntegrationTestBase {

    private static final Map<String, Object> PLAN_25 = Map.of(
            "focusMinutes", 25, "breakMinutes", 5,
            "longBreakMinutes", 15, "longBreakEvery", 4, "setsTarget", 4);

    /** 시작 기록을 과거로 되돌려 실제 경과시간을 재현 */
    private void backdatePomodoroStart(String email, int minutesAgo) {
        jdbcTemplate.update("UPDATE users SET pomodoro_started_at = ? WHERE email = ?",
                LocalDateTime.now().minusMinutes(minutesAgo), email);
    }

    private void startWithPlan() throws Exception {
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(PLAN_25)))
                .andExpect(status().isOk());
    }

    private MvcResult settle(int claimed, boolean finished) throws Exception {
        return mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(
                                Map.of("claimedSessions", claimed, "finished", finished))))
                .andExpect(status().isOk())
                .andReturn();
    }

    @Test
    void 정산_한세트_경과충족이면_코인지급() throws Exception {
        startWithPlan();
        backdatePomodoroStart(USER_A, 26);

        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5))
                .andExpect(jsonPath("$.totalCoins").value(5))
                .andExpect(jsonPath("$.settledSessions").value(1));
    }

    @Test
    void 정산_같은세트_재정산은_0코인_델타만() throws Exception {
        startWithPlan();
        backdatePomodoroStart(USER_A, 26);
        settle(1, false);

        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0))
                .andExpect(jsonPath("$.settledSessions").value(0))
                .andExpect(jsonPath("$.totalCoins").value(5));
    }

    @Test
    void 정산_두세트_누적정산과_통계() throws Exception {
        startWithPlan();
        backdatePomodoroStart(USER_A, 26);
        settle(1, false);
        // 집중25+휴식5+집중25 = 55분 필요 → 56분 경과로 갱신
        backdatePomodoroStart(USER_A, 56);

        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5))
                .andExpect(jsonPath("$.settledSessions").value(1))
                .andExpect(jsonPath("$.totalCoins").value(10));

        mockMvc.perform(get("/me/stats").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pomodoroTotalMinutes").value(50))
                .andExpect(jsonPath("$.pomodoroTotalSessions").value(2));
    }

    @Test
    void 정산_주장이_벽시계_상한을_넘으면_상한까지만() throws Exception {
        startWithPlan();
        backdatePomodoroStart(USER_A, 26); // 1세트만 가능한 경과

        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 4))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5))
                .andExpect(jsonPath("$.settledSessions").value(1));
    }

    @Test
    void 정산_finished면_세션소거_이후_정산불가() throws Exception {
        startWithPlan();
        backdatePomodoroStart(USER_A, 26);
        settle(1, true);
        backdatePomodoroStart(USER_A, 60); // 소거 후 시작시각만 되돌려도 계획이 없으니 정산 불가여야 한다

        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0))
                .andExpect(jsonPath("$.settledSessions").value(0));
    }

    @Test
    void 정산_계획없는_레거시_세션은_0코인() throws Exception {
        mockMvc.perform(post("/pomodoro/start").with(asUser(USER_A)))
                .andExpect(status().isOk());
        backdatePomodoroStart(USER_A, 26);

        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0))
                .andExpect(jsonPath("$.settledSessions").value(0));
    }

    @Test
    void 정산_claimed_0에_finished는_완료없는_리셋() throws Exception {
        startWithPlan();
        settle(0, true);

        // 리셋 후 곧바로 새 계획 시작이 가능해야 한다
        startWithPlan();
        backdatePomodoroStart(USER_A, 26);
        MvcResult r = settle(1, false);
        org.assertj.core.api.Assertions.assertThat(r.getResponse().getContentAsString())
                .contains("\"coins\":5");
    }

    @Test
    void 계획_세션의_complete는_정산없이도_0코인_소거() throws Exception {
        // 계획 세션은 settle 전용 — complete는 거부(0코인)하고 세션을 소거한다
        // (focus=1 계획으로 settle 파밍 후 complete 한 방으로 추가 청구하는 변형도 함께 차단)
        startWithPlan();
        backdatePomodoroStart(USER_A, 26);

        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0));

        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0));
    }

    @Test
    void 계획_세션에_complete를_섞으면_0코인_혼용거부() throws Exception {
        // settle로 정산한 경과시간을 complete로 재청구하는 이중 지급 차단 — 계획 세션은 settle 전용
        startWithPlan();
        backdatePomodoroStart(USER_A, 26);
        settle(1, false);

        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0))
                .andExpect(jsonPath("$.totalCoins").value(5));

        // 혼용 거부가 세션을 소거하므로 이후 settle도 불가
        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0));
    }

    @Test
    void 정산_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/pomodoro/settle")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("claimedSessions", 1))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 정산_body없으면_0코인_200() throws Exception {
        startWithPlan();
        mockMvc.perform(post("/pomodoro/settle").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(0));
    }
}
