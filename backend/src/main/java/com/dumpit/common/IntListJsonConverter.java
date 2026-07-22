package com.dumpit.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/** List<Integer> ↔ "[60,30]" — 프론트 localStorage 시절과 동일한 JSON 배열 문자열 포맷 */
@Converter
public class IntListJsonConverter implements AttributeConverter<List<Integer>, String> {

    @Override
    public String convertToDatabaseColumn(List<Integer> attribute) {
        if (attribute == null || attribute.isEmpty()) return "[]";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < attribute.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(attribute.get(i));
        }
        return sb.append(']').toString();
    }

    @Override
    public List<Integer> convertToEntityAttribute(String dbData) {
        List<Integer> result = new ArrayList<>();
        if (dbData == null) return result;
        String body = dbData.trim();
        if (body.startsWith("[")) body = body.substring(1);
        if (body.endsWith("]")) body = body.substring(0, body.length() - 1);
        for (String part : body.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) result.add(Integer.parseInt(trimmed));
        }
        return result;
    }
}
