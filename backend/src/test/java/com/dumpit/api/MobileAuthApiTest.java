package com.dumpit.api;

import com.dumpit.service.MobileGoogleTokenVerifier;
import com.dumpit.service.MobileGoogleTokenVerifier.GoogleIdClaims;
import com.dumpit.service.MobileGoogleTokenVerifier.InvalidMobileTokenException;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

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
    void 로그인_후_principal_name이_구글_sub와_일치한다() throws Exception {
        // 웹 oauth2Login()은 principal.getName()이 구글 sub가 된다(등록 시 user-name-attribute
        // 오버라이드 없음, Spring 기본값). RedisOAuth2AuthorizedClientRepository는 캘린더 토큰을
        // 오직 principal.getName()으로만 색인하므로(다른 소비처 없음), 모바일 로그인도 같은 값(sub)을
        // 써야 웹에서 연결한 구글 캘린더 토큰을 모바일 세션에서 찾을 수 있다.
        given(mobileGoogleTokenVerifier.verify("good-token"))
                .willReturn(new GoogleIdClaims("mob-sub-2", "mobile2@test.dumpit.local", "모바일유저2", null));

        MvcResult result = mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"good-token\"}"))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();

        SecurityContext context = (SecurityContext) session.getAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertThat(context).isNotNull();
        assertThat(context.getAuthentication().getName()).isEqualTo("mob-sub-2");
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
    void 탈퇴_계정은_복구의사를_밝힌_로그인일_때만_되살아난다() throws Exception {
        given(mobileGoogleTokenVerifier.verify("back-token"))
                .willReturn(new GoogleIdClaims("back-sub", "back@test.dumpit.local", "복귀유저", null));
        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"back-token\"}"))
                .andExpect(status().isOk());
        jdbcTemplate.update(
                "UPDATE users SET status = 'WITHDRAWN', purge_after = ?, withdrawal_marked_at = ? WHERE email = ?",
                LocalDateTime.now().plusDays(30), LocalDateTime.now(), "back@test.dumpit.local");

        // 플래그가 없는 로그인(자동 재로그인 포함)은 탈퇴를 되돌리지 못한다
        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"back-token\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("WITHDRAWAL_PENDING"));

        // 이용자가 직접 눌렀어도 첫 시도는 false — 앱이 이 409를 받아 "복구하시겠습니까?"를 띄운다
        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"back-token\",\"allowRestore\":false}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("WITHDRAWAL_PENDING"));

        // 복구에 동의한 재시도만 복구한다
        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"back-token\",\"allowRestore\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.restored").value(true));
    }

    @Test
    void idToken_없으면_400() throws Exception {
        mockMvc.perform(post("/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
