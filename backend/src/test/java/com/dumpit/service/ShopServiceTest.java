package com.dumpit.service;

import com.dumpit.entity.User;
import com.dumpit.entity.UserEquipment;
import com.dumpit.entity.UserPurchase;
import com.dumpit.exception.BadRequestException;
import com.dumpit.repository.PurchaseRepository;
import com.dumpit.repository.UserEquipmentRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.shop.ShopCatalog;
import com.dumpit.shop.ShopItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShopServiceTest {

    private static final String EMAIL = "user@test.com";

    @Mock UserRepository userRepository;
    @Mock PurchaseRepository purchaseRepository;
    @Mock UserEquipmentRepository equipmentRepository;
    ShopCatalog catalog = new ShopCatalog();
    ShopService shopService;

    @BeforeEach
    void setUp() {
        shopService = new ShopService(catalog, userRepository, purchaseRepository, equipmentRepository);
    }

    private User userWithCoins(int coins) {
        User user = User.of(EMAIL, "tester", "google", "pid");
        user.addCoins(coins);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void 구매_성공시_코인차감_기록_자동장착() {
        User user = userWithCoins(500);
        when(purchaseRepository.existsByUserAndItemCode(user, "bg.ocean")).thenReturn(false);
        when(equipmentRepository.findByUserAndSlot(user, "BACKGROUND")).thenReturn(Optional.empty());

        ShopService.PurchaseResult result = shopService.purchase(EMAIL, "bg.ocean");

        assertThat(result.remainingCoins()).isEqualTo(300);
        assertThat(result.equipped()).isTrue();
        verify(userRepository).save(user);
        ArgumentCaptor<UserPurchase> purchase = ArgumentCaptor.forClass(UserPurchase.class);
        verify(purchaseRepository).save(purchase.capture());
        assertThat(purchase.getValue().getItemCode()).isEqualTo("bg.ocean");
        ArgumentCaptor<UserEquipment> equipment = ArgumentCaptor.forClass(UserEquipment.class);
        verify(equipmentRepository).save(equipment.capture());
        assertThat(equipment.getValue().getItemCode()).isEqualTo("bg.ocean");
        assertThat(equipment.getValue().getSlot()).isEqualTo("BACKGROUND");
    }

    @Test
    void 스티커_구매는_장착하지_않는다() {
        User user = userWithCoins(500);
        when(purchaseRepository.existsByUserAndItemCode(user, "sticker.heart")).thenReturn(false);

        ShopService.PurchaseResult result = shopService.purchase(EMAIL, "sticker.heart");

        assertThat(result.remainingCoins()).isEqualTo(420);
        assertThat(result.equipped()).isFalse();
        verify(purchaseRepository).save(any(UserPurchase.class));
        verify(equipmentRepository, never()).save(any(UserEquipment.class));
    }

    @Test
    void 존재하지_않는_코드는_400() {
        userWithCoins(500);

        assertThatThrownBy(() -> shopService.purchase(EMAIL, "missing"))
                .isInstanceOf(BadRequestException.class);
        verify(purchaseRepository, never()).save(any());
    }

    @Test
    void 이미_보유한_아이템은_400() {
        User user = userWithCoins(500);
        when(purchaseRepository.existsByUserAndItemCode(user, "bg.ocean")).thenReturn(true);

        assertThatThrownBy(() -> shopService.purchase(EMAIL, "bg.ocean"))
                .isInstanceOf(BadRequestException.class);
        assertThat(user.getCoinBalance()).isEqualTo(500);
        verify(purchaseRepository, never()).save(any());
    }

    @Test
    void 잔액_부족은_400_그리고_기록없음() {
        User user = userWithCoins(100);
        when(purchaseRepository.existsByUserAndItemCode(user, "bg.ocean")).thenReturn(false);

        assertThatThrownBy(() -> shopService.purchase(EMAIL, "bg.ocean"))
                .isInstanceOf(BadRequestException.class);
        assertThat(user.getCoinBalance()).isEqualTo(100);
        verify(userRepository, never()).save(any());
        verify(purchaseRepository, never()).save(any());
        verify(equipmentRepository, never()).save(any());
    }

    @Test
    void 장착은_보유_아이템만() {
        User user = userWithCoins(0);
        when(purchaseRepository.existsByUserAndItemCode(user, "bg.ocean")).thenReturn(false);

        assertThatThrownBy(() -> shopService.equip(EMAIL, "bg.ocean"))
                .isInstanceOf(BadRequestException.class);
        verify(equipmentRepository, never()).save(any());
    }

    @Test
    void 장착은_같은_슬롯을_교체한다() {
        User user = userWithCoins(0);
        UserEquipment equipment = UserEquipment.of(user, "BACKGROUND", "bg.lavender");
        when(purchaseRepository.existsByUserAndItemCode(user, "bg.ocean")).thenReturn(true);
        when(equipmentRepository.findByUserAndSlot(user, "BACKGROUND")).thenReturn(Optional.of(equipment));

        shopService.equip(EMAIL, "bg.ocean");

        assertThat(equipment.getItemCode()).isEqualTo("bg.ocean");
        verify(equipmentRepository).save(equipment);
    }

    @Test
    void 스티커는_장착_불가() {
        userWithCoins(0);

        assertThatThrownBy(() -> shopService.equip(EMAIL, "sticker.heart"))
                .isInstanceOf(BadRequestException.class);
        verify(purchaseRepository, never()).existsByUserAndItemCode(any(), any());
        verify(equipmentRepository, never()).save(any());
    }

    @Test
    void 해제는_행을_삭제한다() {
        User user = userWithCoins(0);

        shopService.unequip(EMAIL, ShopItem.Slot.BACKGROUND);

        verify(equipmentRepository).deleteByUserAndSlot(user, "BACKGROUND");
    }

    @Test
    void assertOwnsSticker_미보유면_400_보유면_통과() {
        User user = User.of(EMAIL, "tester", "google", "pid");
        when(purchaseRepository.existsByUserAndItemCode(user, "sticker.heart"))
                .thenReturn(false, true);

        assertThatThrownBy(() -> shopService.assertOwnsSticker(user, "sticker.heart"))
                .isInstanceOf(BadRequestException.class);
        shopService.assertOwnsSticker(user, "sticker.heart");
        verify(purchaseRepository, times(2)).existsByUserAndItemCode(user, "sticker.heart");
    }

    @Test
    void assertOwnsSticker_테마코드는_400() {
        User user = User.of(EMAIL, "tester", "google", "pid");

        assertThatThrownBy(() -> shopService.assertOwnsSticker(user, "bg.ocean"))
                .isInstanceOf(BadRequestException.class);
        verify(purchaseRepository, never()).existsByUserAndItemCode(any(), any());
    }
}
