package com.dumpit.controller;

import com.dumpit.service.ShopService;
import com.dumpit.shop.ShopItem;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/shop")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    @GetMapping("/catalog")
    public ResponseEntity<ShopService.CatalogResponse> getCatalog(@AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(shopService.getCatalog(principal.getAttribute("email")));
    }

    @PostMapping("/purchase")
    public ResponseEntity<?> purchase(@AuthenticationPrincipal OAuth2User principal,
                                      @RequestBody CodeRequest req) {
        ShopService.PurchaseResult result = shopService.purchase(principal.getAttribute("email"), req.code());
        return ResponseEntity.ok(Map.of(
                "message", "구매 완료!",
                "remainingCoins", result.remainingCoins(),
                "equipped", result.equipped()));
    }

    @PutMapping("/equip")
    public ResponseEntity<?> equip(@AuthenticationPrincipal OAuth2User principal,
                                   @RequestBody CodeRequest req) {
        shopService.equip(principal.getAttribute("email"), req.code());
        return ResponseEntity.ok(Map.of("message", "장착했어요."));
    }

    @DeleteMapping("/equip/{slot}")
    public ResponseEntity<?> unequip(@AuthenticationPrincipal OAuth2User principal,
                                     @PathVariable("slot") ShopItem.Slot slot) {
        shopService.unequip(principal.getAttribute("email"), slot);
        return ResponseEntity.ok(Map.of("message", "기본으로 되돌렸어요."));
    }

    public record CodeRequest(String code) {}
}
