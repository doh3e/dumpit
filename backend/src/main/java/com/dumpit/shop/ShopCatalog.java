package com.dumpit.shop;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.dumpit.shop.ShopItem.Slot.*;
import static com.dumpit.shop.ShopItem.Tier.*;

// 카탈로그의 유일한 원본. 다른 곳에서 아이템 목록을 하드코딩하지 말 것.
// (추후 DB 카탈로그로 전환 시 이 클래스만 JPA 구현으로 교체한다)
@Service
public class ShopCatalog {

    private static final List<ShopItem> ITEMS = List.of(
        ShopItem.theme("bg.ocean",    BACKGROUND, "오션",     "차분한 바다빛 팔레트예요.",        200, COLOR),
        ShopItem.theme("bg.lavender", BACKGROUND, "라벤더",   "은은한 보랏빛 팔레트예요.",        200, COLOR),
        ShopItem.theme("bg.sprout",   BACKGROUND, "새싹 정원", "초록이 가득한 정원 테마예요.",      600, CONCEPT),
        ShopItem.theme("chrome.mint", CHROME,     "민트",     "메뉴가 민트빛으로 물들어요.",       150, COLOR),
        ShopItem.theme("chrome.rose", CHROME,     "로즈",     "메뉴가 장밋빛으로 물들어요.",       150, COLOR),
        ShopItem.theme("chrome.wood", CHROME,     "원목 서재", "따뜻한 원목 책상 느낌이에요.",      400, CONCEPT),
        ShopItem.theme("pomo.teal",   POMODORO,   "틸 타이머",  "집중 링이 틸 색으로 바뀌어요.",     150, COLOR),
        ShopItem.theme("pomo.sunset", POMODORO,   "선셋 타이머", "노을빛 집중 링이에요.",           150, COLOR),
        ShopItem.theme("pomo.candy",  POMODORO,   "캔디 타이머", "달콤한 캔디 배색 타이머예요.",     400, CONCEPT),
        ShopItem.theme("planet.crimson", PLANET,  "진홍 행성",  "붉게 타오르는 행성이에요.",        250, COLOR),
        ShopItem.theme("planet.ice",     PLANET,  "얼음 행성",  "차갑게 빛나는 행성이에요.",        250, COLOR),
        ShopItem.theme("planet.ringed",  PLANET,  "고리 행성",  "멋진 고리를 두른 행성이에요.",      500, CONCEPT),
        ShopItem.theme("celeb.shooting-star", CELEBRATION, "별똥별",   "완료 축하로 별똥별이 지나가요.",  500, CONCEPT),
        ShopItem.theme("celeb.ufo",           CELEBRATION, "UFO",     "완료 축하로 UFO가 날아올라요.",   600, CONCEPT),
        ShopItem.theme("celeb.golden-rocket", CELEBRATION, "황금 로켓", "반짝이는 황금 로켓 발사!",       800, CONCEPT),
        ShopItem.theme("station.mint",       STATION, "민트 정거장", "민트빛 우주정거장이에요.",       400, COLOR),
        ShopItem.theme("station.moonbase",   STATION, "달 기지",    "달 표면의 아늑한 기지예요.",      600, CONCEPT),
        ShopItem.theme("station.mothership", STATION, "모선",      "웅장한 모선이에요.",             600, CONCEPT),
        ShopItem.sticker("sticker.heart",     "하트",  "마음이 가는 항목에 붙여요.",  80),
        ShopItem.sticker("sticker.important", "중요!", "놓치면 안 되는 항목에 붙여요.", 100),
        ShopItem.sticker("sticker.star",      "별",    "빛나는 항목에 붙여요.",       100),
        ShopItem.sticker("sticker.fire",      "불꽃",  "지금 불타는 항목에 붙여요.",   120)
    );

    private static final Map<String, ShopItem> BY_CODE =
            ITEMS.stream().collect(Collectors.toUnmodifiableMap(ShopItem::code, Function.identity()));

    public List<ShopItem> getAll() { return ITEMS; }

    public Optional<ShopItem> findByCode(String code) {
        return Optional.ofNullable(code == null ? null : BY_CODE.get(code));
    }
}
