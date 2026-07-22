package com.dumpit.api;

import com.dumpit.service.MobileGoogleTokenVerifier;
import com.dumpit.service.MobileGoogleTokenVerifier.GoogleIdClaims;
import com.dumpit.service.MobileGoogleTokenVerifier.InvalidMobileTokenException;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MobileAuthApiTest extends ApiIntegrationTestBase {

    @MockitoBean
    MobileGoogleTokenVerifier mobileGoogleTokenVerifier;

    @Test
    void 유효_토큰이면_세션이_발급되고_auth_me가_동작한다() throws Exception {
        given(mobileGoogleTokenVerifier.verify("good-token"))
                .willReturn(new GoogleIdClaims("mob-sub-1", "mobile@test.dumpit.local", "모바일유저", null));

        MvcResult result = mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"good-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("mobile@test.dumpit.local"))
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();

        mockMvc.perform(get("/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("mobile@test.dumpit.local"));
    }

    @Test
    void 무효_토큰이면_401() throws Exception {
        given(mobileGoogleTokenVerifier.verify("bad-token"))
                .willThrow(new InvalidMobileTokenException("검증 실패"));

        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"bad-token\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_GOOGLE_TOKEN"));
    }

    @Test
    void 밴_계정이면_403() throws Exception {
        given(mobileGoogleTokenVerifier.verify("banned-token"))
                .willReturn(new GoogleIdClaims("banned-sub", "banned@test.dumpit.local", "밴유저", null));
        // 먼저 한 번 로그인시켜 유저 생성 후 밴 처리 (@Table(name = "users") 확인됨)
        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"banned-token\"}"))
                .andExpect(status().isOk());
        jdbcTemplate.update("UPDATE users SET status = 'BANNED' WHERE email = ?", "banned@test.dumpit.local");

        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"banned-token\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_INACTIVE"));
    }

    @Test
    void idToken_없으면_400() throws Exception {
        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
