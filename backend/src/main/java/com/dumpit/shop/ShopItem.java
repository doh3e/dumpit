package com.dumpit.shop;

import java.util.List;

public record ShopItem(
        String code, ItemType type, Slot slot,
        String name, String description, int price, Tier tier, List<Variant> variants) {

    public ShopItem {
        variants = List.copyOf(variants);
    }

    public record Variant(String code, String name) {}

    public enum ItemType { THEME, STICKER }
    public enum Slot { BACKGROUND, CHROME, POMODORO, PLANET, CELEBRATION, STATION }
    public enum Tier { COLOR, CONCEPT }

    public static ShopItem theme(String code, Slot slot, String name, String description, int price, Tier tier) {
        return theme(code, slot, name, description, price, tier, List.of());
    }

    public static ShopItem theme(String code, Slot slot, String name, String description, int price, Tier tier,
                                 List<Variant> variants) {
        return new ShopItem(code, ItemType.THEME, slot, name, description, price, tier, variants);
    }

    public static ShopItem sticker(String code, String name, String description, int price) {
        return new ShopItem(code, ItemType.STICKER, null, name, description, price, Tier.COLOR, List.of());
    }

    public String defaultVariant() {
        return variants.isEmpty() ? null : variants.getFirst().code();
    }

    public boolean hasVariant(String code) {
        return variants.stream().anyMatch(variant -> variant.code().equals(code));
    }
}
