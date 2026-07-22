package com.dumpit.common;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class IntListJsonConverterTest {

    private final IntListJsonConverter converter = new IntListJsonConverter();

    @Test
    void 리스트를_JSON_배열_문자열로_직렬화한다() {
        assertThat(converter.convertToDatabaseColumn(List.of(60, 30))).isEqualTo("[60,30]");
        assertThat(converter.convertToDatabaseColumn(List.of())).isEqualTo("[]");
        assertThat(converter.convertToDatabaseColumn(null)).isEqualTo("[]");
    }

    @Test
    void JSON_배열_문자열을_리스트로_복원한다() {
        assertThat(converter.convertToEntityAttribute("[60,30]")).containsExactly(60, 30);
        assertThat(converter.convertToEntityAttribute("[60]")).containsExactly(60);
        assertThat(converter.convertToEntityAttribute("[]")).isEmpty();
        assertThat(converter.convertToEntityAttribute(null)).isEmpty();
    }
}
