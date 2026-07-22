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

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserServiceImpl extends DefaultOAuth2UserService implements CustomOAuth2UserService {

    private final GoogleUserUpserter googleUserUpserter;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId().toUpperCase();
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
            googleUserUpserter.upsert(providerId, email, name, picture);
        } catch (GoogleUserUpserter.AccountInactiveException e) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("account_inactive"), "This account is not active.");
        }

        return oAuth2User;
    }
}
