package com.dumpit.api;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityErrorResponseTest extends ApiIntegrationTestBase {

    @Test
    void 미인증_401은_한글_JSON() throws Exception {
        MvcResult result = mockMvc.perform(get("/tasks"))
                .andExpect(status().isUnauthorized())
                // 브리프의 assertKoreanError만으로는 mojibake 문자열도 통과할 수 있어
                // (한글 범위 문자가 우연히 섞여 있음) 정확한 메시지까지 검증한다.
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."))
                .andReturn();
        assertKoreanError(result);
    }
}
