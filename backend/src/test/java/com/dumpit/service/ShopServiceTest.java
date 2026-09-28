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
import java.util.List;

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
        when(purchaseRepository.findByUserAndItemCode(user, "bg.ocean")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shopService.equip(EMAIL, "bg.ocean"))
                .isInstanceOf(BadRequestException.class);
        verify(equipmentRepository, never()).save(any());
    }

    @Test
    void 장착은_같은_슬롯을_교체한다() {
        User user = userWithCoins(0);
        UserEquipment equipment = UserEquipment.of(user, "BACKGROUND", "bg.lavender");
        when(purchaseRepository.findByUserAndItemCode(user, "bg.ocean"))
                .thenReturn(Optional.of(UserPurchase.of(user, "bg.ocean", 200)));
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

    @Test
    void 선택한_고양이_외형으로_구매하고_새_가격만큼_차감한다() {
        User user = userWithCoins(2000);

        ShopService.PurchaseResult result = shopService.purchase(EMAIL, "station.cat", "gray");

        assertThat(result.remainingCoins()).isEqualTo(400);
        ArgumentCaptor<UserPurchase> saved = ArgumentCaptor.forClass(UserPurchase.class);
        verify(purchaseRepository).save(saved.capture());
        assertThat(saved.getValue().getPrice()).isEqualTo(1600);
        assertThat(saved.getValue().getSelectedVariant()).isEqualTo("gray");
    }

    @Test
    void 기존_구매의_외형_변경은_코인과_원래_가격을_보존한다() {
        User user = userWithCoins(123);
        UserPurchase purchase = UserPurchase.of(user, "station.cat", 800);
        when(purchaseRepository.findByUserAndItemCode(user, "station.cat")).thenReturn(Optional.of(purchase));

        shopService.equip(EMAIL, "station.cat", "black");
        shopService.equip(EMAIL, "station.cat");

        assertThat(user.getCoinBalance()).isEqualTo(123);
        assertThat(purchase.getPrice()).isEqualTo(800);
        assertThat(purchase.getSelectedVariant()).isEqualTo("black");
        verify(userRepository, never()).save(any());
    }

    @Test
    void 저장된_외형이_없거나_알수없으면_카탈로그와_장착정보는_기본외형을_반환한다() {
        User user = userWithCoins(0);
        UserPurchase cat = UserPurchase.of(user, "station.cat", 800);
        UserPurchase dog = UserPurchase.of(user, "station.dog", 800);
        dog.changeSelectedVariant("removed-variant");
        when(purchaseRepository.findByUser(user)).thenReturn(List.of(cat, dog));
        when(equipmentRepository.findByUser(user)).thenReturn(List.of(UserEquipment.of(user, "STATION", "station.dog")));

        ShopService.CatalogResponse response = shopService.getCatalog(EMAIL);
        assertThat(response.items()).filteredOn(item -> item.code().equals("station.cat"))
                .singleElement().satisfies(item -> assertThat(item.selectedVariant()).isEqualTo("ginger"));
        assertThat(response.items()).filteredOn(item -> item.code().equals("station.dog"))
                .singleElement().satisfies(item -> assertThat(item.selectedVariant()).isEqualTo("golden-retriever"));
        assertThat(shopService.getEquipmentVariants(user)).containsEntry("STATION", "golden-retriever");
        assertThat(cat.getSelectedVariant()).isNull();
        assertThat(dog.getSelectedVariant()).isEqualTo("removed-variant");
    }

    @Test
    void 잘못된_외형_구매는_예외전에도_잔액을_바꾸지_않는다() {
        User user = userWithCoins(2000);

        assertThatThrownBy(() -> shopService.purchase(EMAIL, "station.cat", "akita"))
                .isInstanceOf(BadRequestException.class);

        assertThat(user.getCoinBalance()).isEqualTo(2000);
        verify(userRepository, never()).save(any());
        verify(purchaseRepository, never()).save(any());
        verify(equipmentRepository, never()).save(any());
    }

    @Test
    void 외형_상품의_중복구매와_잔액부족은_선택과_코인을_바꾸지_않는다() {
        User user = userWithCoins(1599);
        assertThatThrownBy(() -> shopService.purchase(EMAIL, "station.cat", "white"))
                .isInstanceOf(BadRequestException.class).hasMessage("코인이 부족합니다.");
        when(purchaseRepository.existsByUserAndItemCode(user, "station.cat")).thenReturn(true);
        assertThatThrownBy(() -> shopService.purchase(EMAIL, "station.cat", "gray"))
                .isInstanceOf(BadRequestException.class).hasMessage("이미 보유한 아이템입니다.");

        assertThat(user.getCoinBalance()).isEqualTo(1599);
        verify(purchaseRepository, never()).save(any());
        verify(equipmentRepository, never()).save(any());
    }
}
