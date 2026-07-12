package com.dumpit.shop;

public record ShopItem(
        String code, ItemType type, Slot slot,
        String name, String description, int price, Tier tier) {

    public enum ItemType { THEME, STICKER }
    public enum Slot { BACKGROUND, CHROME, POMODORO, PLANET, CELEBRATION, STATION }
    public enum Tier { COLOR, CONCEPT }

    public static ShopItem theme(String code, Slot slot, String name, String description, int price, Tier tier) {
        return new ShopItem(code, ItemType.THEME, slot, name, description, price, tier);
    }

    public static ShopItem sticker(String code, String name, String description, int price) {
        return new ShopItem(code, ItemType.STICKER, null, name, description, price, Tier.COLOR);
    }
}
