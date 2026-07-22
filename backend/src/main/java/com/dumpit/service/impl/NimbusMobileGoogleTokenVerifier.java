package com.dumpit.service.impl;

import com.dumpit.service.MobileGoogleTokenVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

/** 구글 JWKS로 모바일 ID 토큰을 로컬 검증한다 (iss·exp·aud). */
@Service
public class NimbusMobileGoogleTokenVerifier implements MobileGoogleTokenVerifier {

    private static final String GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> GOOGLE_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    private final JwtDecoder jwtDecoder;

    public NimbusMobileGoogleTokenVerifier(
            @Value("${app.mobile.google-client-ids:${spring.security.oauth2.client.registration.google.client-id}}")
            List<String> allowedClientIds) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                issuerValidator(GOOGLE_ISSUERS),
                audienceValidator(allowedClientIds)));
        this.jwtDecoder = decoder;
    }

    /**
     * 테스트 가능하도록 분리 — iss가 구글의 두 표기(스킴 유무) 중 하나면 통과.
     * getIssuer()는 URL 파싱이라 스킴 없는 "accounts.google.com"에서 예외 — 문자열 비교 필수.
     */
    public static OAuth2TokenValidator<Jwt> issuerValidator(Set<String> allowedIssuers) {
        return jwt -> {
            String iss = jwt.getClaimAsString(JwtClaimNames.ISS);
            return iss != null && allowedIssuers.contains(iss)
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(
                            new OAuth2Error("invalid_token", "iss가 구글이 아닙니다.", null));
        };
    }

    /** 테스트 가능하도록 분리 — aud에 허용 클라이언트 ID가 하나라도 있으면 통과. */
    public static OAuth2TokenValidator<Jwt> audienceValidator(List<String> allowedClientIds) {
        return jwt -> jwt.getAudience() != null
                && jwt.getAudience().stream().anyMatch(allowedClientIds::contains)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_token", "aud가 허용된 클라이언트가 아닙니다.", null));
    }

    @Override
    public GoogleIdClaims verify(String idToken) {
        try {
            Jwt jwt = jwtDecoder.decode(idToken);
            String email = jwt.getClaimAsString("email");
            if (!StringUtils.hasText(email)) {
                throw new InvalidMobileTokenException("email 클레임이 없습니다.");
            }
            return new GoogleIdClaims(jwt.getSubject(), email,
                    jwt.getClaimAsString("name"), jwt.getClaimAsString("picture"));
        } catch (JwtException e) {
            throw new InvalidMobileTokenException("Google ID 토큰 검증 실패", e);
        }
    }
}
