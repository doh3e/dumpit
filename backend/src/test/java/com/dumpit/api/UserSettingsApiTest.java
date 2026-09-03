package com.dumpit.api;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserSettingsApiTest extends ApiIntegrationTestBase {

    @Test
    void 설정이_없으면_기본값을_돌려준다() throws Exception {
        mockMvc.perform(get("/me/settings").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routineStartHour").value(9))
                .andExpect(jsonPath("$.routineEndHour").value(22))
                .andExpect(jsonPath("$.notificationsEnabled").value(true))
                .andExpect(jsonPath("$.notificationThresholds[0]").value(60));
    }

    @Test
    void 부분_갱신하면_나머지_값은_유지되고_같은_행에_저장된다() throws Exception {
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":10,\"routineEndHour\":23}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routineStartHour").value(10))
                .andExpect(jsonPath("$.notificationsEnabled").value(true));

        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"notificationsEnabled\":false,\"notificationThresholds\":[720,10]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routineStartHour").value(10))
                .andExpect(jsonPath("$.notificationsEnabled").value(false))
                .andExpect(jsonPath("$.notificationThresholds[0]").value(720))
                .andExpect(jsonPath("$.notificationThresholds[1]").value(10));

        Integer rows = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_settings", Integer.class);
        org.assertj.core.api.Assertions.assertThat(rows).isEqualTo(1);

        mockMvc.perform(get("/me/settings").with(asUser(USER_A)))
                .andExpect(jsonPath("$.routineStartHour").value(10))
                .andExpect(jsonPath("$.routineEndHour").value(23));
    }

    @Test
    void 자정을_넘기는_활동시간도_저장된다() throws Exception {
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":22,\"routineEndHour\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routineStartHour").value(22))
                .andExpect(jsonPath("$.routineEndHour").value(2));
    }

    @Test
    void 잘못된_값은_400과_한글_에러를_돌려준다() throws Exception {
        assertKoreanError(mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":24}"))
                .andExpect(status().isBadRequest())
                .andReturn());

        assertKoreanError(mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":9,\"routineEndHour\":9}"))
                .andExpect(status().isBadRequest())
                .andReturn());

        assertKoreanError(mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"notificationThresholds\":[45]}"))
                .andExpect(status().isBadRequest())
                .andReturn());
    }

    @Test
    void AI_메모리를_저장하고_비우고_다른_설정은_건드리지_않는다() throws Exception {
        // 저장 — 응답과 재조회 모두에 반영
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"aiMemory\":\"운동이 최우선. '펌'은 회사 프로젝트.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiMemory").value("운동이 최우선. '펌'은 회사 프로젝트."))
                .andExpect(jsonPath("$.routineStartHour").value(9));

        // aiMemory 없는 부분 갱신은 메모리를 유지
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":10}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiMemory").value("운동이 최우선. '펌'은 회사 프로젝트."));

        // 빈 문자열로 비우기
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"aiMemory\":\"  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiMemory").doesNotExist());
    }

    @Test
    void AI_메모리_500자_초과는_400과_한글_에러를_돌려준다() throws Exception {
        String tooLong = "가".repeat(501);
        assertKoreanError(mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"aiMemory\":\"" + tooLong + "\"}"))
                .andExpect(status().isBadRequest())
                .andReturn());

        // 정확히 500자는 저장된다
        String maxLen = "가".repeat(500);
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"aiMemory\":\"" + maxLen + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiMemory").value(maxLen));
    }

    @Test
    void 다른_유저의_설정과_섞이지_않는다() throws Exception {
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":22,\"routineEndHour\":2}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/me/settings").with(asUser(USER_B)))
                .andExpect(jsonPath("$.routineStartHour").value(9));
    }

    @Test
    void 탈퇴해도_유예중에는_설정_행이_남는다() throws Exception {
        // 유예 기간 안에 복구하면 설정도 그대로 돌려줘야 한다.
        // 실제 삭제는 유예 종료 시 users 삭제의 CASCADE로 이뤄진다(AccountPurgeService).
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":10}"))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/me/account").with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        Integer rows = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_settings", Integer.class);
        org.assertj.core.api.Assertions.assertThat(rows).isEqualTo(1);
    }
}
