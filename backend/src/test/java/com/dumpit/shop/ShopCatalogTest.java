package com.dumpit.shop;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class ShopCatalogTest {

    private final ShopCatalog catalog = new ShopCatalog();

    @Test
    void 카탈로그는_63개_아이템을_가진다() {
        assertThat(catalog.getAll()).hasSize(63);
    }

    @Test
    void 코드는_전부_유일하다() {
        assertThat(catalog.getAll().stream().map(ShopItem::code).distinct()).hasSize(63);
    }

    @Test
    void 테마는_슬롯을_갖고_스티커는_슬롯이_없다() {
        assertThat(catalog.getAll()).allSatisfy(item -> {
            if (item.type() == ShopItem.ItemType.THEME) assertThat(item.slot()).isNotNull();
            else assertThat(item.slot()).isNull();
        });
    }

    @Test
    void findByCode는_존재하면_아이템_없으면_빈값() {
        assertThat(catalog.findByCode("bg.ocean")).isPresent();
        assertThat(catalog.findByCode("no.such")).isEmpty();
    }

    @Test
    void 동물_묶음과_단일_상품의_가격을_구분한다() {
        assertThat(catalog.findByCode("station.cat").orElseThrow().price()).isEqualTo(1600);
        assertThat(catalog.findByCode("station.dog").orElseThrow().price()).isEqualTo(1600);
        assertThat(catalog.findByCode("station.hamster").orElseThrow().price()).isEqualTo(1000);
        assertThat(catalog.findByCode("station.squirrel").orElseThrow().price()).isEqualTo(1000);
    }

    @Test
    void 교체된_외형도_기존_구매코드와_가격을_사용한다() {
        assertThat(catalog.findByCode("station.hamster").orElseThrow().name()).isEqualTo("회색 토끼");
        ShopItem hearts = catalog.findByCode("celeb.shooting-star").orElseThrow();
        assertThat(hearts.name()).isEqualTo("하트 축하");
        assertThat(hearts.description()).isEqualTo("완주의 기쁨을 하트로 전해요.");
        assertThat(hearts.price()).isEqualTo(600);
    }

    @Test
    void 고양이와_강아지는_서로_다른_여섯_외형과_기본값을_제공한다() {
        ShopItem cat = catalog.findByCode("station.cat").orElseThrow();
        ShopItem dog = catalog.findByCode("station.dog").orElseThrow();
        assertThat(cat.variants()).extracting(ShopItem.Variant::code)
                .containsExactly("ginger", "black", "gray", "brown", "white", "gray-tabby");
        assertThat(dog.variants()).extracting(ShopItem.Variant::code)
                .containsExactly("golden-retriever", "akita", "great-dane", "schnauzer", "saint-bernard", "siberian-husky");
        assertThat(cat.defaultVariant()).isEqualTo("ginger");
        assertThat(dog.defaultVariant()).isEqualTo("golden-retriever");
        assertThat(cat.hasVariant("akita")).isFalse();
        assertThat(dog.hasVariant("ginger")).isFalse();
        assertThat(catalog.getAll()).filteredOn(item -> !item.code().equals("station.cat") && !item.code().equals("station.dog"))
                .allSatisfy(item -> {
                    assertThat(item.variants()).isEmpty();
                    assertThat(item.defaultVariant()).isNull();
                });
    }
}
