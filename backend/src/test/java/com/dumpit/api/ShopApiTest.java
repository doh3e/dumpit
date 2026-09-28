package com.dumpit.api;

import com.dumpit.entity.User;
import tools.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// ShopServiceTest가 서비스 로직(코인 차감·중복구매·장착 규칙 등)을 이미 커버하므로
// 여기서는 HTTP 계층(라우팅·인증·직렬화·예외 매핑)에 집중한다.
class ShopApiTest extends ApiIntegrationTestBase {

    private void seedCoins(User user, int amount) {
        jdbcTemplate.update("UPDATE users SET coin_balance = ? WHERE email = ?", amount, user.getEmail());
    }

    private void seedPurchase(User user, String itemCode, int price) {
        jdbcTemplate.update(
                "INSERT INTO user_purchases (purchase_id, user_id, item_code, price, purchased_at) VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(), user.getUserId(), itemCode, price, LocalDateTime.now());
    }

    private void seedEquipment(User user, String slot, String itemCode) {
        jdbcTemplate.update(
                "INSERT INTO user_equipments (equipment_id, user_id, slot, item_code, updated_at) VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(), user.getUserId(), slot, itemCode, LocalDateTime.now());
    }

    /** items 배열에서 code가 일치하는 노드를 찾는다 */
    private JsonNode findItem(JsonNode items, String code) {
        for (JsonNode item : items) {
            if (code.equals(item.get("code").asString())) return item;
        }
        throw new AssertionError("카탈로그에서 코드를 찾을 수 없음: " + code);
    }

    private JsonNode catalogBody(String email) throws Exception {
        String body = mockMvc.perform(get("/shop/catalog").with(asUser(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(body);
    }

    // ---------- GET /shop/catalog ----------

    @Test
    void 카탈로그_63종_반환_및_구매전후_owned_equipped_플래그_변화() throws Exception {
        seedCoins(userA, 1000);

        JsonNode before = catalogBody(USER_A);
        assertThat(before.get("coinBalance").asInt()).isEqualTo(1000);
        assertThat(before.get("items")).hasSize(63);
        JsonNode bgOceanBefore = findItem(before.get("items"), "bg.ocean");
        assertThat(bgOceanBefore.get("type").asString()).isEqualTo("THEME");
        assertThat(bgOceanBefore.get("slot").asString()).isEqualTo("BACKGROUND");
        assertThat(bgOceanBefore.get("owned").asBoolean()).isFalse();
        assertThat(bgOceanBefore.get("equipped").asBoolean()).isFalse();

        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remainingCoins").value(800))
                .andExpect(jsonPath("$.equipped").value(true));

        JsonNode after = catalogBody(USER_A);
        assertThat(after.get("coinBalance").asInt()).isEqualTo(800);
        JsonNode bgOceanAfter = findItem(after.get("items"), "bg.ocean");
        assertThat(bgOceanAfter.get("owned").asBoolean()).isTrue();
        assertThat(bgOceanAfter.get("equipped").asBoolean()).isTrue();
        // 구매하지 않은 동일 슬롯 아이템은 여전히 미보유·미장착
        JsonNode bgLavender = findItem(after.get("items"), "bg.lavender");
        assertThat(bgLavender.get("owned").asBoolean()).isFalse();
        assertThat(bgLavender.get("equipped").asBoolean()).isFalse();
        // 스티커는 slot이 없다
        JsonNode sticker = findItem(after.get("items"), "sticker.heart");
        assertThat(sticker.get("slot").isNull()).isTrue();
        assertThat(sticker.get("variants")).isEmpty();
        assertThat(sticker.get("selectedVariant").isNull()).isTrue();
    }

    @Test
    void 카탈로그_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/shop/catalog"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 카탈로그_쿼리카운트_상한() throws Exception {
        seedCoins(userA, 1000);
        seedPurchase(userA, "bg.ocean", 200);
        seedPurchase(userA, "chrome.ocean", 150);
        seedPurchase(userA, "pomo.ocean", 150);
        seedPurchase(userA, "sticker.heart", 80);
        seedPurchase(userA, "station.cat", 800);
        seedPurchase(userA, "station.dog", 800);
        seedEquipment(userA, "BACKGROUND", "bg.ocean");
        seedEquipment(userA, "CHROME", "chrome.ocean");

        long count = queryCount(() -> mockMvc.perform(get("/shop/catalog").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(63)));

        assertThat(count).isLessThanOrEqualTo(5);
    }

    @Test
    void 외형_선택_구매는_1600코인_차감하고_선택과_기존_장착코드를_반환한다() throws Exception {
        seedCoins(userA, 2000);

        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"station.cat\",\"variant\":\"gray\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remainingCoins").value(400))
                .andExpect(jsonPath("$.equipped").value(true));

        JsonNode cat = findItem(catalogBody(USER_A).get("items"), "station.cat");
        assertThat(cat.get("variants")).hasSize(6);
        assertThat(cat.get("selectedVariant").asString()).isEqualTo("gray");
        assertThat(cat.get("owned").asBoolean()).isTrue();
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipments.STATION").value("station.cat"))
                .andExpect(jsonPath("$.equipmentVariants.STATION").value("gray"));
        mockMvc.perform(get("/auth/me").with(asUser(USER_B)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentVariants.STATION").doesNotExist());
    }

    @Test
    void 기존_800코인_구매자는_무료로_변경하고_동물별_외형을_기억한다() throws Exception {
        seedCoins(userA, 123);
        seedPurchase(userA, "station.cat", 800);
        seedPurchase(userA, "station.dog", 800);
        seedEquipment(userA, "STATION", "station.cat");
        var before = jdbcTemplate.queryForMap(
                "SELECT purchase_id, price, purchased_at FROM user_purchases WHERE user_id = ? AND item_code = ?",
                userA.getUserId(), "station.cat");

        JsonNode legacyCat = findItem(catalogBody(USER_A).get("items"), "station.cat");
        assertThat(legacyCat.get("selectedVariant").asString()).isEqualTo("ginger");
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentVariants.STATION").value("ginger"));

        mockMvc.perform(put("/shop/equip").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"station.cat\",\"variant\":\"white\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/shop/equip").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"station.dog\",\"variant\":\"akita\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/shop/equip").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"station.cat\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(123))
                .andExpect(jsonPath("$.equipments.STATION").value("station.cat"))
                .andExpect(jsonPath("$.equipmentVariants.STATION").value("white"));
        assertThat(jdbcTemplate.queryForMap(
                "SELECT purchase_id, price, purchased_at FROM user_purchases WHERE user_id = ? AND item_code = ?",
                userA.getUserId(), "station.cat")).isEqualTo(before);
        JsonNode items = catalogBody(USER_A).get("items");
        assertThat(findItem(items, "station.cat").get("selectedVariant").asString()).isEqualTo("white");
        assertThat(findItem(items, "station.dog").get("selectedVariant").asString()).isEqualTo("akita");

        mockMvc.perform(delete("/shop/equip/STATION").with(asUser(USER_A))).andExpect(status().isOk());
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentVariants.STATION").doesNotExist());
        mockMvc.perform(put("/shop/equip").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"station.dog\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentVariants.STATION").value("akita"));
    }

    @Test
    void 구_클라이언트의_외형없는_구매는_기본외형을_저장한다() throws Exception {
        seedCoins(userA, 1600);
        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"station.dog\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remainingCoins").value(0));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT selected_variant FROM user_purchases WHERE user_id = ? AND item_code = ?",
                String.class, userA.getUserId(), "station.dog")).isEqualTo("golden-retriever");
    }

    @ParameterizedTest
    @CsvSource({"station.cat,''", "station.cat,missing", "station.cat,akita", "station.dog,ginger",
            "station.hamster,ginger", "bg.ocean,ginger", "sticker.heart,ginger"})
    void 잘못된_외형_구매는_코인과_구매_장착을_변경하지_않는다(String code, String variant) throws Exception {
        seedCoins(userA, 2000);
        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("code", code, "variant", variant))))
                .andExpect(status().isBadRequest());
        assertThat(userRepository.findById(userA.getUserId()).orElseThrow().getCoinBalance()).isEqualTo(2000);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM user_purchases", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM user_equipments", Integer.class)).isZero();
    }

    @Test
    void 잘못된_외형_장착과_다른_사용자의_상품_장착은_기존선택을_유지한다() throws Exception {
        seedCoins(userA, 100);
        seedPurchase(userA, "station.cat", 800);
        seedEquipment(userA, "STATION", "station.cat");
        for (String variant : new String[]{"", "akita", "unknown"}) {
            mockMvc.perform(put("/shop/equip").with(asUser(USER_A))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(java.util.Map.of("code", "station.cat", "variant", variant))))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(put("/shop/equip").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"station.cat\",\"variant\":\"gray\"}"))
                .andExpect(status().isBadRequest());
        assertThat(jdbcTemplate.queryForObject("SELECT selected_variant FROM user_purchases WHERE user_id = ?",
                String.class, userA.getUserId())).isNull();
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(100))
                .andExpect(jsonPath("$.equipments.STATION").value("station.cat"))
                .andExpect(jsonPath("$.equipmentVariants.STATION").value("ginger"));
    }

    // ---------- POST /shop/purchase ----------

    @Test
    void 구매_코인차감_및_테마자동장착() throws Exception {
        seedCoins(userA, 500);

        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("구매 완료!"))
                .andExpect(jsonPath("$.remainingCoins").value(300))
                .andExpect(jsonPath("$.equipped").value(true));
    }

    @Test
    void 구매_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/shop/purchase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 구매_존재하지_않는_코드면_400_한글() throws Exception {
        seedCoins(userA, 500);

        MvcResult result = mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"not.a.real.code\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 구매_잔액부족이면_400_정확한메시지() throws Exception {
        seedCoins(userA, 100); // bg.ocean 가격은 200

        MvcResult result = mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("코인이 부족합니다."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 구매_중복구매면_400_정확한메시지() throws Exception {
        seedCoins(userA, 1000);
        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("이미 보유한 아이템입니다."))
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- PUT /shop/equip ----------

    @Test
    void 장착_보유한_테마로_같은_슬롯을_교체한다() throws Exception {
        seedCoins(userA, 1000);
        // 둘 다 구매 → 나중 구매(bg.lavender)가 자동 장착되어 슬롯을 차지한 상태
        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.lavender\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/shop/equip").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("장착했어요."));

        JsonNode after = catalogBody(USER_A);
        assertThat(findItem(after.get("items"), "bg.ocean").get("equipped").asBoolean()).isTrue();
        assertThat(findItem(after.get("items"), "bg.lavender").get("equipped").asBoolean()).isFalse();
    }

    @Test
    void 장착_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(put("/shop/equip")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 장착_미보유_아이템이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(put("/shop/equip").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 장착_스티커코드는_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(put("/shop/equip").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- DELETE /shop/equip/{slot} ----------

    @Test
    void 해제_성공하면_equipments에서_제거된다() throws Exception {
        seedCoins(userA, 1000);
        mockMvc.perform(post("/shop/purchase").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bg.ocean\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/shop/equip/BACKGROUND").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("기본으로 되돌렸어요."));

        JsonNode after = catalogBody(USER_A);
        assertThat(findItem(after.get("items"), "bg.ocean").get("equipped").asBoolean()).isFalse();
    }

    @Test
    void 해제_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(delete("/shop/equip/BACKGROUND"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    // 코인샵 사이클에서 이연된 알려진 부채: enum 바인딩 실패가 catch-all 500으로 새던 것을
    // GlobalExceptionHandler의 MethodArgumentTypeMismatchException 핸들러로 400 + 한글 메시지로 픽스.
    @Test
    void 해제_잘못된_slot_문자열이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(delete("/shop/equip/NOPE").with(asUser(USER_A)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("요청값이 올바르지 않습니다."))
                .andReturn();
        assertKoreanError(result);
    }

    // 위 핸들러는 @RestControllerAdvice로 앱 전역에 적용되므로 다른 도메인의 UUID 경로 파라미터
    // 오형식도 함께 400으로 바뀐다 — 회귀 확인 (TaskController DELETE /tasks/{taskId}가 UUID 바인딩).
    @Test
    void 회귀_다른도메인_UUID_경로파라미터_오형식도_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(delete("/tasks/not-a-uuid").with(asUser(USER_A)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("요청값이 올바르지 않습니다."))
                .andReturn();
        assertKoreanError(result);
    }
}
