package com.dumpit.controller;

import com.dumpit.entity.User;
import com.dumpit.service.GoogleUserUpserter;
import com.dumpit.service.MobileGoogleTokenVerifier;
import com.dumpit.service.MobileGoogleTokenVerifier.GoogleIdClaims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 모바일 앱 전용 로그인. 네이티브 구글 로그인으로 받은 ID 토큰을 검증하고
 * 웹 oauth2Login과 동일한 형태(OAuth2AuthenticationToken + OAuth2User principal)의
 * 서버 세션을 발급한다 — /auth/me·가드 필터가 기대하는 email 속성 포함.
 */
@RestController
@RequestMapping("/auth/mobile")
@RequiredArgsConstructor
public class MobileAuthController {

    private final MobileGoogleTokenVerifier tokenVerifier;
    private final GoogleUserUpserter googleUserUpserter;
    private final SecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    public record MobileGoogleLoginRequest(@NotBlank String idToken) {}
    public record MobileLoginResponse(String email, String nickname, String picture) {}

    @PostMapping("/google")
    public ResponseEntity<MobileLoginResponse> google(@Valid @RequestBody MobileGoogleLoginRequest body,
                                                      HttpServletRequest request,
                                                      HttpServletResponse response) {
        GoogleIdClaims claims = tokenVerifier.verify(body.idToken());
        User user = googleUserUpserter.upsert(claims.sub(), claims.email(), claims.name(), claims.picture());

        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put("sub", claims.sub());
        attributes.put("email", user.getEmail());
        if (user.getNickname() != null) attributes.put("name", user.getNickname());
        if (user.getPicture() != null) attributes.put("picture", user.getPicture());

        DefaultOAuth2User principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("OAUTH2_USER")), attributes, "email");
        OAuth2AuthenticationToken authentication =
                new OAuth2AuthenticationToken(principal, principal.getAuthorities(), "google");

        // 세션 고정 공격 방지 — 로그인 시 기존 세션 폐기 후 새 세션에 컨텍스트 저장
        HttpSession oldSession = request.getSession(false);
        if (oldSession != null) oldSession.invalidate();
        request.getSession(true);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        return ResponseEntity.ok(new MobileLoginResponse(user.getEmail(), user.getNickname(), user.getPicture()));
    }
}
