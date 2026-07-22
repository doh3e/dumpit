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
    void 다른_유저의_설정과_섞이지_않는다() throws Exception {
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":22,\"routineEndHour\":2}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/me/settings").with(asUser(USER_B)))
                .andExpect(jsonPath("$.routineStartHour").value(9));
    }

    @Test
    void 탈퇴하면_설정_행도_삭제된다() throws Exception {
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType("application/json")
                        .content("{\"routineStartHour\":10}"))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/me/account").with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        Integer rows = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_settings", Integer.class);
        org.assertj.core.api.Assertions.assertThat(rows).isEqualTo(0);
    }
}
