package com.dumpit.service;

import com.dumpit.entity.*;
import com.dumpit.exception.BadRequestException;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.*;
import com.dumpit.shop.ShopCatalog;
import com.dumpit.shop.ShopItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShopService {

    private final ShopCatalog catalog;
    private final UserRepository userRepository;
    private final PurchaseRepository purchaseRepository;
    private final UserEquipmentRepository equipmentRepository;

    public record CatalogItem(String code, String type, String slot, String name, String description,
                              int price, String tier, boolean owned, boolean equipped,
                              List<ShopItem.Variant> variants, String selectedVariant) {}
    public record CatalogResponse(int coinBalance, List<CatalogItem> items) {}
    public record PurchaseResult(int remainingCoins, boolean equipped) {}

    @Transactional(readOnly = true)
    public CatalogResponse getCatalog(String email) {
        User user = findUser(email);
        Map<String, UserPurchase> purchases = purchasesByCode(user);
        Map<String, String> equipped = getEquipments(user); // slot명 → code

        List<CatalogItem> items = catalog.getAll().stream()
                .map(i -> new CatalogItem(
                        i.code(), i.type().name(),
                        i.slot() != null ? i.slot().name() : null,
                        i.name(), i.description(), i.price(), i.tier().name(),
                        purchases.containsKey(i.code()),
                        i.slot() != null && i.code().equals(equipped.get(i.slot().name())),
                        i.variants(), selectedVariant(i, purchases.get(i.code()))))
                .toList();
        return new CatalogResponse(user.getCoinBalance(), items);
    }

    @Transactional
    public PurchaseResult purchase(String email, String code) {
        return purchase(email, code, null);
    }

    @Transactional
    public PurchaseResult purchase(String email, String code, String variant) {
        User user = findUser(email);
        ShopItem item = catalog.findByCode(code)
                .orElseThrow(() -> new BadRequestException("존재하지 않는 아이템입니다."));
        validateVariant(item, variant);
        if (purchaseRepository.existsByUserAndItemCode(user, code)) {
            throw new BadRequestException("이미 보유한 아이템입니다.");
        }
        if (!user.spendCoins(item.price())) {
            throw new BadRequestException("코인이 부족합니다.");
        }
        userRepository.save(user);
        UserPurchase purchase = UserPurchase.of(user, code, item.price());
        purchase.changeSelectedVariant(variant != null ? variant : item.defaultVariant());
        purchaseRepository.save(purchase);

        boolean equipped = false;
        if (item.type() == ShopItem.ItemType.THEME) {
            upsertEquipment(user, item);
            equipped = true;
        }
        return new PurchaseResult(user.getCoinBalance(), equipped);
    }

    @Transactional
    public void equip(String email, String code) {
        equip(email, code, null);
    }

    @Transactional
    public void equip(String email, String code, String variant) {
        User user = findUser(email);
        ShopItem item = catalog.findByCode(code)
                .orElseThrow(() -> new BadRequestException("존재하지 않는 아이템입니다."));
        validateVariant(item, variant);
        if (item.type() != ShopItem.ItemType.THEME) {
            throw new BadRequestException("장착할 수 없는 아이템입니다.");
        }
        UserPurchase purchase = purchaseRepository.findByUserAndItemCode(user, code)
                .orElseThrow(() -> new BadRequestException("보유하지 않은 아이템입니다."));
        if (!item.variants().isEmpty()) {
            purchase.changeSelectedVariant(variant != null ? variant : selectedVariant(item, purchase));
            purchaseRepository.save(purchase);
        }
        upsertEquipment(user, item);
    }

    @Transactional
    public void unequip(String email, ShopItem.Slot slot) {
        User user = findUser(email);
        equipmentRepository.deleteByUserAndSlot(user, slot.name());
    }

    @Transactional(readOnly = true)
    public Map<String, String> getEquipments(User user) {
        return equipmentRepository.findByUser(user).stream()
                .collect(Collectors.toMap(UserEquipment::getSlot, UserEquipment::getItemCode));
    }

    @Transactional(readOnly = true)
    public Map<String, String> getEquipmentVariants(User user) {
        Map<String, UserPurchase> purchases = purchasesByCode(user);
        Map<String, String> variants = new HashMap<>();
        getEquipments(user).forEach((slot, code) -> catalog.findByCode(code).ifPresent(item -> {
            String variant = selectedVariant(item, purchases.get(code));
            if (variant != null) variants.put(slot, variant);
        }));
        return variants;
    }

    @Transactional(readOnly = true)
    public void assertOwnsSticker(User user, String code) {
        ShopItem item = catalog.findByCode(code)
                .orElseThrow(() -> new BadRequestException("존재하지 않는 스티커입니다."));
        if (item.type() != ShopItem.ItemType.STICKER) {
            throw new BadRequestException("스티커가 아닌 아이템입니다.");
        }
        if (!purchaseRepository.existsByUserAndItemCode(user, code)) {
            throw new BadRequestException("보유하지 않은 스티커입니다.");
        }
    }

    private void upsertEquipment(User user, ShopItem item) {
        String slot = item.slot().name();
        equipmentRepository.findByUserAndSlot(user, slot)
                .ifPresentOrElse(
                        e -> { e.changeItem(item.code()); equipmentRepository.save(e); },
                        () -> equipmentRepository.save(UserEquipment.of(user, slot, item.code())));
    }

    private Map<String, UserPurchase> purchasesByCode(User user) {
        return purchaseRepository.findByUser(user).stream()
                .collect(Collectors.toMap(UserPurchase::getItemCode, purchase -> purchase));
    }

    private String selectedVariant(ShopItem item, UserPurchase purchase) {
        String stored = purchase != null ? purchase.getSelectedVariant() : null;
        return item.hasVariant(stored) ? stored : item.defaultVariant();
    }

    private void validateVariant(ShopItem item, String variant) {
        if (variant != null && !item.hasVariant(variant)) {
            throw new BadRequestException("선택할 수 없는 외형입니다.");
        }
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }
}
