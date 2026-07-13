package com.dumpit.shop;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class ShopCatalogTest {

    private final ShopCatalog catalog = new ShopCatalog();

    @Test
    void 카탈로그는_45개_아이템을_가진다() {
        assertThat(catalog.getAll()).hasSize(45);
    }

    @Test
    void 코드는_전부_유일하다() {
        assertThat(catalog.getAll().stream().map(ShopItem::code).distinct()).hasSize(45);
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
}
