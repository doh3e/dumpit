package com.dumpit.dto;

import java.util.List;

public record NoticePageResponse(
        List<NoticeResponse> pinned,
        List<NoticeResponse> notices,
        int page,
        int totalPages,
        long totalElements
) {}
