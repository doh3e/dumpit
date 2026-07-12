package com.dumpit.api;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SmokeApiTest extends ApiIntegrationTestBase {

    @Test
    void health는_인증_없이_200() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
    }

    @Test
    void 미인증_authMe는_401_JSON() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
        // 한글 메시지 검증은 Task 2(SecurityConfig 픽스) 후 추가
    }

    @Test
    void 인증된_authMe는_유저정보와_코인잔액_반환() throws Exception {
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(USER_A))
                .andExpect(jsonPath("$.coins").isNumber())
                .andExpect(jsonPath("$.equipments").exists());
    }
}
