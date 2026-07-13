package com.dumpit.api;

import com.dumpit.service.AccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AuthenticatedRequestGuardFilter 회귀/실증 테스트.
 * (docs/superpowers/audits/2026-07-13-api-audit-report.md §2 High #1, #2)
 */
class SessionGuardApiTest extends ApiIntegrationTestBase {

    @Autowired private AccountService accountService;

    // ---------- 밴/탈퇴 게이트 ----------

    @Test
    void 밴된유저_세션유지중_상태변경도_401_한글() throws Exception {
        mockMvc.perform(patch("/admin/users/" + userB.getUserId() + "/ban").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"테스트 밴\"}"))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"focusMinutes\":25}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 탈퇴한유저_세션유지중_401_한글() throws Exception {
        // 탈퇴 시 email이 익명화되므로, 세션엔 원래 email이 캐시돼 있어도
        // DB 재조회(findByEmail(원래 email))가 비어 밴과 동일한 경로로 걸려야 한다.
        accountService.withdraw(userB.getEmail());

        MvcResult result = mockMvc.perform(get("/tasks").with(asUser(USER_B)))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void ACTIVE유저는_밴게이트에_안걸림_회귀없음() throws Exception {
        mockMvc.perform(get("/tasks").with(asUser(USER_A)))
                .andExpect(status().isOk());
    }

    @Test
    void 인증됐지만_email없는_principal은_401_fail_closed() throws Exception {
        // 인증된 OAuth2User인데 email 속성이 없는 이상 케이스 → 통과가 아니라 fail-closed 401.
        // (sub만 넣어 유효한 principal을 만들되 email은 비운다.)
        MvcResult result = mockMvc.perform(get("/tasks")
                        .with(oauth2Login().attributes(attrs -> attrs.put("sub", "no-email-subject"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- CSRF 커스텀 헤더 ----------

    @Test
    void 인증된유저_XRequestedWith없이_상태변경POST_403_한글() throws Exception {
        // asUser()는 X-Requested-With를 자동 합성하므로, 헤더를 뺀 채 재현하려면
        // oauth2Login()만 직접 적용한다(비교: asUser는 이 두 요소를 합성한 헬퍼).
        MvcResult result = mockMvc.perform(post("/pomodoro/complete")
                        .with(oauth2Login().attributes(attrs -> {
                            attrs.put("email", USER_A);
                            attrs.put("name", "테스트유저");
                        }))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"focusMinutes\":25}"))
                .andExpect(status().isForbidden())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 인증된유저_XRequestedWith있으면_상태변경POST_정상() throws Exception {
        // asUser()가 헤더를 합성해 넣으므로, 기존에 이 헬퍼를 쓰는 모든 상태변경 테스트가
        // 이미 이걸 증명하고 있다 — 여기선 대표로 한 번 더 확인.
        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"focusMinutes\":25}"))
                .andExpect(status().isOk());
    }

    @Test
    void GET은_XRequestedWith없어도_통과() throws Exception {
        mockMvc.perform(get("/tasks")
                        .with(oauth2Login().attributes(attrs -> {
                            attrs.put("email", USER_A);
                            attrs.put("name", "테스트유저");
                        })))
                .andExpect(status().isOk());
    }
}
