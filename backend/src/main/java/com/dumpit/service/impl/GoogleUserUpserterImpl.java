package com.dumpit.service.impl;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.GoogleUserUpserter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleUserUpserterImpl implements GoogleUserUpserter {

    private static final String PROVIDER = "GOOGLE";

    private final UserRepository userRepository;

    @Override
    public User upsert(String providerId, String email, String name, String picture) {
        return userRepository.findByProviderAndProviderId(PROVIDER, providerId)
                .map(existing -> {
                    if (!existing.isActive()) {
                        throw new AccountInactiveException("비활성 계정입니다.");
                    }
                    existing.updatePicture(picture);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> {
                    log.info("New user registered: provider={}, id_prefix={}",
                            PROVIDER, providerId.substring(0, Math.min(6, providerId.length())) + "...");
                    User newUser = User.of(email, name, PROVIDER, providerId);
                    newUser.updatePicture(picture);
                    return userRepository.save(newUser);
                });
    }
}
