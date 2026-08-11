package com.dumpit.service.impl;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.AccountRestoreService;
import com.dumpit.service.GoogleUserUpserter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleUserUpserterImpl implements GoogleUserUpserter {

    private static final String PROVIDER = "GOOGLE";

    private final UserRepository userRepository;
    private final AccountRestoreService accountRestoreService;

    @Override
    public UpsertResult upsert(String providerId, String email, String name, String picture) {
        return userRepository.findByProviderAndProviderId(PROVIDER, providerId)
                .map(existing -> {
                    // 유예 기간 안에 같은 구글 계정으로 돌아왔다면 탈퇴를 철회한 것으로 본다.
                    // 유예가 끝난 계정은 purge 스케줄러가 이미 지웠거나 곧 지우므로 되살리지 않는다.
                    if (isRestorable(existing)) {
                        User restored = accountRestoreService.restore(existing);
                        restored.updatePicture(picture);
                        return new UpsertResult(userRepository.save(restored), true);
                    }
                    if (!existing.isActive()) {
                        throw new AccountInactiveException("비활성 계정입니다.");
                    }
                    existing.updatePicture(picture);
                    return new UpsertResult(userRepository.save(existing), false);
                })
                .orElseGet(() -> {
                    log.info("New user registered: provider={}, id_prefix={}",
                            PROVIDER, providerId.substring(0, Math.min(6, providerId.length())) + "...");
                    User newUser = User.of(email, name, PROVIDER, providerId);
                    newUser.updatePicture(picture);
                    return new UpsertResult(userRepository.save(newUser), false);
                });
    }

    private boolean isRestorable(User user) {
        return user.getStatus() == User.Status.WITHDRAWN
                && user.getPurgeAfter() != null
                && LocalDateTime.now().isBefore(user.getPurgeAfter());
    }
}
