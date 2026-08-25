package com.dumpit.service.impl;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleCalendarMemoTest {

    private static final String MARKER = GoogleCalendarServiceImpl.IMPORT_MARKER;

    @Test
    void 장소_설명_모두없으면_마커만() {
        assertThat(GoogleCalendarServiceImpl.buildImportMemo(null, null)).isEqualTo(MARKER);
        assertThat(GoogleCalendarServiceImpl.buildImportMemo("  ", "")).isEqualTo(MARKER);
    }

    @Test
    void 장소만_있으면_장소와_마커() {
        assertThat(GoogleCalendarServiceImpl.buildImportMemo("강남역 스터디카페", null))
                .isEqualTo("장소: 강남역 스터디카페\n\n" + MARKER);
    }

    @Test
    void 설명만_있으면_설명과_마커() {
        assertThat(GoogleCalendarServiceImpl.buildImportMemo(null, "준비물: 노트북"))
                .isEqualTo("준비물: 노트북\n\n" + MARKER);
    }

    @Test
    void 장소와_설명_모두_있으면_순서대로() {
        assertThat(GoogleCalendarServiceImpl.buildImportMemo("스파르타", "발표 리허설 포함"))
                .isEqualTo("장소: 스파르타\n발표 리허설 포함\n\n" + MARKER);
    }

    @Test
    void HTML_태그는_제거되고_br은_개행이_된다() {
        assertThat(GoogleCalendarServiceImpl.buildImportMemo(null,
                "<b>중요</b> 회의<br>자료는 <a href=\"http://x\">링크</a> 참고"))
                .isEqualTo("중요 회의\n자료는 링크 참고\n\n" + MARKER);
    }

    @Test
    void HTML_엔티티는_이중디코드_없이_풀린다() {
        assertThat(GoogleCalendarServiceImpl.stripHtml("A &amp; B / &amp;lt; 그대로"))
                .isEqualTo("A & B / &lt; 그대로");
    }

    @Test
    void 긴_설명은_마커를_남기고_1000자로_절단() {
        String memo = GoogleCalendarServiceImpl.buildImportMemo(null, "가".repeat(2000));
        assertThat(memo).hasSizeLessThanOrEqualTo(1000);
        assertThat(memo).endsWith("\n\n" + MARKER);
        assertThat(memo).contains("…");
    }
}
