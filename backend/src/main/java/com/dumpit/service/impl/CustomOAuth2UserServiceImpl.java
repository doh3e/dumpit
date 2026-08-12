package com.dumpit.service.impl;

import com.dumpit.service.CustomOAuth2UserService;
import com.dumpit.service.GoogleUserUpserter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserServiceImpl extends DefaultOAuth2UserService implements CustomOAuth2UserService {

    /** 복구 안내를 successHandler로 넘기는 요청 속성 키 */
    public static final String ACCOUNT_RESTORED_ATTRIBUTE = "dumpit.accountRestored";

    /**
     * "복구하시겠습니까?"에 이용자가 동의하고 다시 들어온 로그인임을 콜백에 알리는 세션 속성 키.
     * /oauth2/authorization/google?restore=1 진입 시 리졸버가 심고(SecurityConfig), 없으면 지운다.
     * 인가 요청·콜백이 같은 세션을 공유하는 구조(저장된 authorization request와 동일)에 편승한다.
     */
    public static final String RESTORE_INTENT_SESSION_ATTRIBUTE = "dumpit.restoreIntent";

    private final GoogleUserUpserter googleUserUpserter;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String providerId = oAuth2User.getAttribute("sub");
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");

        if (providerId == null) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_token"), "Google sub claim is missing."
            );
        }

        try {
            // 로그인 버튼을 눌렀다는 사실만으로는 복구 의사로 보지 않는다. 유예 중 계정이면 아래
            // withdrawal_pending으로 실패시켜 프런트가 "복구하시겠습니까?"를 묻고, 동의하면
            // ?restore=1로 재진입해 세션에 의사가 실린다.
            GoogleUserUpserter.UpsertResult result =
                    googleUserUpserter.upsert(providerId, email, name, picture, consumeRestoreIntent());
            if (result.restored()) {
                // 이 메서드와 successHandler는 같은 콜백 요청 안에서 돌아간다 —
                // 요청 속성으로 넘겨 리다이렉트 URL에 복구 안내 플래그를 붙인다.
                RequestContextHolder.currentRequestAttributes()
                        .setAttribute(ACCOUNT_RESTORED_ATTRIBUTE, true, RequestAttributes.SCOPE_REQUEST);
            }
        } catch (GoogleUserUpserter.WithdrawalPendingException e) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("withdrawal_pending"), "This account is pending withdrawal.");
        } catch (GoogleUserUpserter.AccountInactiveException e) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("account_inactive"), "This account is not active.");
        }

        return oAuth2User;
    }

    /** 세션에 실린 복구 의사를 읽고 지운다 — 한 번의 콜백에만 유효한 일회성 신호다. */
    static boolean consumeRestoreIntent() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes == null) return false;
        Object intent = attributes.getAttribute(RESTORE_INTENT_SESSION_ATTRIBUTE, RequestAttributes.SCOPE_SESSION);
        if (intent == null) return false;
        attributes.removeAttribute(RESTORE_INTENT_SESSION_ATTRIBUTE, RequestAttributes.SCOPE_SESSION);
        return Boolean.TRUE.equals(intent);
    }
}
