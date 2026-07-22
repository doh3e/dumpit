package com.dumpit.service;

import com.dumpit.service.impl.NimbusMobileGoogleTokenVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class MobileGoogleTokenVerifierTest {

    private Jwt jwtWithAudience(List<String> aud) {
        return Jwt.withTokenValue("t")
                .header("alg", "RS256")
                .subject("sub-1")
                .audience(aud)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .claim("email", "a@b.c")
                .build();
    }

    private Jwt jwtWithIssuer(String issuer) {
        return Jwt.withTokenValue("t")
                .header("alg", "RS256")
                .subject("sub-1")
                .issuer(issuer)
                .audience(List.of("cid-1"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .claim("email", "a@b.c")
                .build();
    }

    @Test
    void 허용된_클라이언트ID_aud면_성공() {
        OAuth2TokenValidator<Jwt> v = NimbusMobileGoogleTokenVerifier.audienceValidator(List.of("cid-1", "cid-2"));
        assertThat(v.validate(jwtWithAudience(List.of("cid-2"))).hasErrors()).isFalse();
    }

    @Test
    void 다른_aud면_실패() {
        OAuth2TokenValidator<Jwt> v = NimbusMobileGoogleTokenVerifier.audienceValidator(List.of("cid-1"));
        assertThat(v.validate(jwtWithAudience(List.of("evil"))).hasErrors()).isTrue();
    }

    @Test
    void 스킴_있는_구글_iss면_성공() {
        OAuth2TokenValidator<Jwt> v = NimbusMobileGoogleTokenVerifier.issuerValidator(
                Set.of("https://accounts.google.com", "accounts.google.com"));
        assertThat(v.validate(jwtWithIssuer("https://accounts.google.com")).hasErrors()).isFalse();
    }

    @Test
    void 스킴_없는_구글_iss면_성공() {
        OAuth2TokenValidator<Jwt> v = NimbusMobileGoogleTokenVerifier.issuerValidator(
                Set.of("https://accounts.google.com", "accounts.google.com"));
        assertThat(v.validate(jwtWithIssuer("accounts.google.com")).hasErrors()).isFalse();
    }

    @Test
    void 구글이_아닌_iss면_실패() {
        OAuth2TokenValidator<Jwt> v = NimbusMobileGoogleTokenVerifier.issuerValidator(
                Set.of("https://accounts.google.com", "accounts.google.com"));
        assertThat(v.validate(jwtWithIssuer("https://evil.example")).hasErrors()).isTrue();
    }
}
