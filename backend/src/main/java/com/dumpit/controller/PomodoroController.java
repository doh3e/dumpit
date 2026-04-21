package com.dumpit.controller;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/pomodoro")
@RequiredArgsConstructor
public class PomodoroController {

    private static final int POMODORO_COIN_REWARD = 15;

    private final UserRepository userRepository;

    @PostMapping("/complete")
    @Transactional
    public ResponseEntity<Map<String, Object>> completeSession(
            @AuthenticationPrincipal OAuth2User principal) {
        String email = principal.getAttribute("email");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다"));

        user.addCoins(POMODORO_COIN_REWARD);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "coins", POMODORO_COIN_REWARD,
                "totalCoins", user.getCoinBalance()
        ));
    }
}
