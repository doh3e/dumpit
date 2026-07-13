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
                              int price, String tier, boolean owned, boolean equipped) {}
    public record CatalogResponse(int coinBalance, List<CatalogItem> items) {}
    public record PurchaseResult(int remainingCoins, boolean equipped) {}

    @Transactional(readOnly = true)
    public CatalogResponse getCatalog(String email) {
        User user = findUser(email);
        Set<String> owned = purchaseRepository.findByUser(user).stream()
                .map(UserPurchase::getItemCode).collect(Collectors.toSet());
        Map<String, String> equipped = getEquipments(user); // slot명 → code

        List<CatalogItem> items = catalog.getAll().stream()
                .map(i -> new CatalogItem(
                        i.code(), i.type().name(),
                        i.slot() != null ? i.slot().name() : null,
                        i.name(), i.description(), i.price(), i.tier().name(),
                        owned.contains(i.code()),
                        i.slot() != null && i.code().equals(equipped.get(i.slot().name()))))
                .toList();
        return new CatalogResponse(user.getCoinBalance(), items);
    }

    @Transactional
    public PurchaseResult purchase(String email, String code) {
        User user = findUser(email);
        ShopItem item = catalog.findByCode(code)
                .orElseThrow(() -> new BadRequestException("존재하지 않는 아이템입니다."));
        if (purchaseRepository.existsByUserAndItemCode(user, code)) {
            throw new BadRequestException("이미 보유한 아이템입니다.");
        }
        if (!user.spendCoins(item.price())) {
            throw new BadRequestException("코인이 부족합니다.");
        }
        userRepository.save(user);
        purchaseRepository.save(UserPurchase.of(user, code, item.price()));

        boolean equipped = false;
        if (item.type() == ShopItem.ItemType.THEME) {
            upsertEquipment(user, item);
            equipped = true;
        }
        return new PurchaseResult(user.getCoinBalance(), equipped);
    }

    @Transactional
    public void equip(String email, String code) {
        User user = findUser(email);
        ShopItem item = catalog.findByCode(code)
                .orElseThrow(() -> new BadRequestException("존재하지 않는 아이템입니다."));
        if (item.type() != ShopItem.ItemType.THEME) {
            throw new BadRequestException("장착할 수 없는 아이템입니다.");
        }
        if (!purchaseRepository.existsByUserAndItemCode(user, code)) {
            throw new BadRequestException("보유하지 않은 아이템입니다.");
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

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }
}
