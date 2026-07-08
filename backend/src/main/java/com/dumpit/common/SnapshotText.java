package com.dumpit.common;

import java.util.Map;

/**
 * activity_logs 스냅샷에는 민감할 수 있는 원문 텍스트를 남기지 않는다.
 * 원문 대신 길이 메타데이터만 기록한다. (예: title -> titleLength)
 */
public final class SnapshotText {

    private SnapshotText() {}

    public static void putMasked(Map<String, Object> values, String key, String raw) {
        values.put(key + "Length", raw == null ? null : raw.length());
    }
}
