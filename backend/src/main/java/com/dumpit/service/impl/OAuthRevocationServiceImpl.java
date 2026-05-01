package com.dumpit.service.impl;

import com.dumpit.service.OAuthRevocationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Slf4j
@Service
public class OAuthRevocationServiceImpl implements OAuthRevocationService {

    private final RestClient restClient = RestClient.builder()
            .baseUrl("https://oauth2.googleapis.com")
            .build();

    @Override
    public void revokeGoogle(OAuth2AuthorizedClient client) {
        if (client == null) return;

        OAuth2RefreshToken refreshToken = client.getRefreshToken();
        if (refreshToken != null) {
            revoke(refreshToken.getTokenValue());
            return;
        }

        OAuth2AccessToken accessToken = client.getAccessToken();
        if (accessToken != null) {
            revoke(accessToken.getTokenValue());
        }
    }

    private void revoke(String token) {
        if (token == null || token.isBlank()) return;
        try {
            restClient.post()
                    .uri("/revoke")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body("token=" + token)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Google OAuth token revoke failed: {}", ex.getMessage());
        }
    }
}
