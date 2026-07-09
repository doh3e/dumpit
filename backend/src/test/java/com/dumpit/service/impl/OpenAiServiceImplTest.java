package com.dumpit.service.impl;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiServiceImplTest {

    @Test
    @SuppressWarnings("unchecked")
    void 우선순위_응답은_strict_json_schema를_쓴다() {
        Map<String, Object> format = OpenAiServiceImpl.priorityResponseFormat();

        assertThat(format.get("type")).isEqualTo("json_schema");
        Map<String, Object> jsonSchema = (Map<String, Object>) format.get("json_schema");
        assertThat(jsonSchema.get("strict")).isEqualTo(true);

        Map<String, Object> schema = (Map<String, Object>) jsonSchema.get("schema");
        assertThat((List<String>) schema.get("required"))
                .containsExactlyInAnyOrder("score", "category", "reason");

        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        Map<String, Object> category = (Map<String, Object>) properties.get("category");
        assertThat((List<String>) category.get("enum")).containsExactlyInAnyOrder(
                "WORK", "STUDY", "APPOINTMENT", "CHORE", "ROUTINE", "HEALTH", "HOBBY", "OTHER");
    }

    @Test
    void gpt5_계열은_temperature_대신_reasoning_effort_minimal을_쓴다() {
        Map<String, Object> body = OpenAiServiceImpl.chatRequestBody(
                "gpt-5-mini", "system prompt", "user prompt", Map.of("type", "json_object"));

        assertThat(body).doesNotContainKey("temperature");
        assertThat(body.get("reasoning_effort")).isEqualTo("minimal");
        assertThat(body.get("model")).isEqualTo("gpt-5-mini");
    }

    @Test
    void gpt4_계열은_기존대로_temperature_0_3을_쓴다() {
        Map<String, Object> body = OpenAiServiceImpl.chatRequestBody(
                "gpt-4o-mini", "system prompt", "user prompt", Map.of("type", "json_object"));

        assertThat(body.get("temperature")).isEqualTo(0.3);
        assertThat(body).doesNotContainKey("reasoning_effort");
    }
}
