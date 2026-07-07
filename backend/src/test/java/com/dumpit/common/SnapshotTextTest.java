package com.dumpit.common;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SnapshotTextTest {

    @Test
    void 원문_대신_길이만_기록한다() {
        Map<String, Object> values = new LinkedHashMap<>();
        SnapshotText.putMasked(values, "title", "김철수 변호사에게 소송 자료 보내기");

        assertThat(values).containsEntry("titleLength", "김철수 변호사에게 소송 자료 보내기".length());
        assertThat(values).doesNotContainKey("title");
    }

    @Test
    void null_원문은_길이도_null로_기록한다() {
        Map<String, Object> values = new LinkedHashMap<>();
        SnapshotText.putMasked(values, "description", null);

        assertThat(values).containsEntry("descriptionLength", null);
        assertThat(values).doesNotContainKey("description");
    }
}
