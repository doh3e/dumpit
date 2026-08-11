package com.dumpit.controller;

import com.dumpit.dto.DeviceRegisterRequest;
import com.dumpit.entity.DeviceToken;
import com.dumpit.entity.User;
import com.dumpit.repository.DeviceTokenRepository;
import com.dumpit.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/me/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    @PostMapping
    @Transactional
    public ResponseEntity<Void> register(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody DeviceRegisterRequest request) {
        User user = findUser(principal);
        deviceTokenRepository.findByToken(request.token())
                .ifPresentOrElse(
                        existing -> existing.touch(user, request.platformOrDefault()),
                        () -> deviceTokenRepository.save(
                                DeviceToken.of(user, request.token(), request.platformOrDefault())));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{token}")
    @Transactional
    public ResponseEntity<Void> unregister(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("token") String token) {
        deviceTokenRepository.deleteByUserAndToken(findUser(principal), token);
        return ResponseEntity.noContent().build();
    }

    private User findUser(OAuth2User principal) {
        return userRepository.findByEmail(principal.getAttribute("email"))
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
    }
}
