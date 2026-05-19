package com.dumpit.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;

@Slf4j
@RequiredArgsConstructor
public class RedisOAuth2AuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

    private static final String KEY_PREFIX = "dumpit:oauth2:authorized-client:";

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    @SuppressWarnings("unchecked")
    public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(String clientRegistrationId,
                                                                    Authentication principal,
                                                                    HttpServletRequest request) {
        String principalName = principalName(principal);
        if (principalName == null) return null;

        String raw = redisTemplate.opsForValue().get(key(clientRegistrationId, principalName));
        if (raw == null) return null;

        try {
            StoredAuthorizedClient stored = objectMapper.readValue(raw, StoredAuthorizedClient.class);
            ClientRegistration clientRegistration =
                    clientRegistrationRepository.findByRegistrationId(clientRegistrationId);
            if (clientRegistration == null || stored.accessTokenValue() == null) return null;

            OAuth2AccessToken accessToken = new OAuth2AccessToken(
                    OAuth2AccessToken.TokenType.BEARER,
                    stored.accessTokenValue(),
                    stored.accessTokenIssuedAt(),
                    stored.accessTokenExpiresAt(),
                    stored.accessTokenScopes()
            );

            OAuth2RefreshToken refreshToken = stored.refreshTokenValue() == null
                    ? null
                    : new OAuth2RefreshToken(stored.refreshTokenValue(), stored.refreshTokenIssuedAt());

            return (T) new OAuth2AuthorizedClient(
                    clientRegistration,
                    stored.principalName(),
                    accessToken,
                    refreshToken
            );
        } catch (Exception e) {
            log.warn("Failed to load OAuth2 authorized client from Redis: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public void saveAuthorizedClient(OAuth2AuthorizedClient authorizedClient,
                                     Authentication principal,
                                     HttpServletRequest request,
                                     HttpServletResponse response) {
        String principalName = principalName(principal);
        if (principalName == null) return;

        OAuth2RefreshToken refreshToken = authorizedClient.getRefreshToken();
        if (refreshToken == null) {
            OAuth2AuthorizedClient existing = loadAuthorizedClient(
                    authorizedClient.getClientRegistration().getRegistrationId(),
                    principal,
                    request
            );
            refreshToken = existing == null ? null : existing.getRefreshToken();
        }

        OAuth2AccessToken accessToken = authorizedClient.getAccessToken();
        StoredAuthorizedClient stored = new StoredAuthorizedClient(
                authorizedClient.getClientRegistration().getRegistrationId(),
                principalName,
                accessToken.getTokenValue(),
                accessToken.getIssuedAt(),
                accessToken.getExpiresAt(),
                accessToken.getScopes(),
                refreshToken == null ? null : refreshToken.getTokenValue(),
                refreshToken == null ? null : refreshToken.getIssuedAt()
        );

        try {
            redisTemplate.opsForValue().set(key(stored.clientRegistrationId(), principalName), objectMapper.writeValueAsString(stored));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to save OAuth2 authorized client to Redis", e);
        }
    }

    @Override
    public void removeAuthorizedClient(String clientRegistrationId,
                                       Authentication principal,
                                       HttpServletRequest request,
                                       HttpServletResponse response) {
        String principalName = principalName(principal);
        if (principalName != null) {
            redisTemplate.delete(key(clientRegistrationId, principalName));
        }
    }

    private String principalName(Authentication principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return null;
        }
        return principal.getName();
    }

    private String key(String clientRegistrationId, String principalName) {
        String encodedPrincipal = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(principalName.getBytes(StandardCharsets.UTF_8));
        return KEY_PREFIX + clientRegistrationId + ":" + encodedPrincipal;
    }

    private record StoredAuthorizedClient(
            String clientRegistrationId,
            String principalName,
            String accessTokenValue,
            Instant accessTokenIssuedAt,
            Instant accessTokenExpiresAt,
            Set<String> accessTokenScopes,
            String refreshTokenValue,
            Instant refreshTokenIssuedAt
    ) {}
}
