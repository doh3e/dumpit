package com.dumpit.service;

import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;

public interface OAuthRevocationService {
    void revokeGoogle(OAuth2AuthorizedClient client);
}
