package com.dumpit.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 웹 복구 흐름의 의사 전달 검증 — ?restore=1 재진입이 세션에 심은 복구 의사를
 * OAuth 콜백(CustomOAuth2UserService)이 한 번만 읽고 소진하는지.
 */
class CustomOAuth2UserServiceRestoreIntentTest {

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void 요청_컨텍스트가_없으면_복구의사_없음() {
        RequestContextHolder.resetRequestAttributes();

        assertThat(CustomOAuth2UserServiceImpl.consumeRestoreIntent()).isFalse();
    }

    @Test
    void 세션에_의사가_없으면_복구의사_없음() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        assertThat(CustomOAuth2UserServiceImpl.consumeRestoreIntent()).isFalse();
    }

    @Test
    void 세션에_실린_복구의사는_한_번만_유효하다() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.getSession().setAttribute(
                CustomOAuth2UserServiceImpl.RESTORE_INTENT_SESSION_ATTRIBUTE, Boolean.TRUE);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        assertThat(CustomOAuth2UserServiceImpl.consumeRestoreIntent()).isTrue();
        // 소진 후 재호출 — 콜백 한 번에만 유효한 일회성 신호여야 뒤의 평범한 로그인이 탈퇴를 되돌리지 않는다
        assertThat(CustomOAuth2UserServiceImpl.consumeRestoreIntent()).isFalse();
        assertThat(request.getSession().getAttribute(
                CustomOAuth2UserServiceImpl.RESTORE_INTENT_SESSION_ATTRIBUTE)).isNull();
    }
}
