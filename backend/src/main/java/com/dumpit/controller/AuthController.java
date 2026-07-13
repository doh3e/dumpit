package com.dumpit.controller;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.ShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final ShopService shopService;

    @GetMapping("/me")
    public ResponseEntity<UserMeResponse> me(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getAttribute("email");
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !user.isActive()) {
            return ResponseEntity.status(403).build();
        }
        int coins = user != null ? user.getCoinBalance() : 0;
        boolean isAdmin = Boolean.TRUE.equals(user.getIsAdmin());

        return ResponseEntity.ok(new UserMeResponse(
            user.getEmail(),
            user.getNickname(),
            user.getPicture(),
            coins,
            isAdmin,
            shopService.getEquipments(user)
        ));
    }

    public record UserMeResponse(String email, String name, String picture, int coins, boolean isAdmin,
                                 Map<String, String> equipments) {}
}
