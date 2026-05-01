package com.dumpit.controller;

import com.dumpit.entity.User;
import com.dumpit.entity.UserPurchase;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.PurchaseRepository;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/shop")
@RequiredArgsConstructor
public class ShopController {

    private final UserRepository userRepository;
    private final PurchaseRepository purchaseRepository;

    private static final List<ShopItemInfo> CATALOG = List.of(
        new ShopItemInfo(1, "반짝 별 스티커",  "STICKER", 100, "#FFD700"),
        new ShopItemInfo(2, "무지개 스티커",    "STICKER", 150, "#FF6B6B"),
        new ShopItemInfo(3, "하트 스티커",      "STICKER",  80, "#FF69B4"),
        new ShopItemInfo(4, "불꽃 테마",        "THEME",   500, "#FF4500"),
        new ShopItemInfo(5, "파스텔 테마",      "THEME",   400, "#DDA0DD"),
        new ShopItemInfo(6, "우주 테마",        "THEME",   600, "#4169E1")
    );

    @GetMapping("/items")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ShopItemResponse>> getItems(
            @AuthenticationPrincipal OAuth2User principal) {

        User user = findUser(principal);
        Set<Integer> ownedIds = purchaseRepository.findByUser(user).stream()
                .map(UserPurchase::getItemId)
                .collect(Collectors.toSet());

        List<ShopItemResponse> items = CATALOG.stream()
                .map(c -> new ShopItemResponse(
                        c.id(), c.name(), c.category(), c.price(), c.color(),
                        ownedIds.contains(c.id())))
                .toList();

        return ResponseEntity.ok(items);
    }

    @PostMapping("/purchase")
    @Transactional
    public ResponseEntity<?> purchase(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody PurchaseRequest req) {

        User user = findUser(principal);

        ShopItemInfo item = CATALOG.stream()
                .filter(c -> c.id() == req.itemId())
                .findFirst()
                .orElse(null);

        if (item == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "존재하지 않는 아이템입니다"));
        }

        if (purchaseRepository.existsByUserAndItemId(user, req.itemId())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 보유한 아이템입니다"));
        }

        if (!user.spendCoins(item.price())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "코인이 부족합니다"));
        }

        userRepository.save(user);
        purchaseRepository.save(UserPurchase.of(user, item.id(), item.price()));

        return ResponseEntity.ok(Map.of(
                "message", "구매 완료!",
                "remainingCoins", user.getCoinBalance()
        ));
    }

    private User findUser(OAuth2User principal) {
        String email = principal.getAttribute("email");
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }

    private record ShopItemInfo(int id, String name, String category, int price, String color) {}
    public record ShopItemResponse(int id, String name, String category, int price, String color, boolean isOwned) {}
    public record PurchaseRequest(int itemId) {}
}
