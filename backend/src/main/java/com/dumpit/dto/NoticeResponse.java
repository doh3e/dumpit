package com.dumpit.dto;

import com.dumpit.entity.Notice;

import java.time.LocalDateTime;
import java.util.UUID;

public record NoticeResponse(
        UUID noticeId,
        String title,
        String content,
        String status,
        LocalDateTime publishAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static NoticeResponse from(Notice notice) {
        return new NoticeResponse(
                notice.getNoticeId(),
                notice.getTitle(),
                notice.getContent(),
                notice.getStatus().name(),
                notice.getPublishAt(),
                notice.getCreatedAt(),
                notice.getUpdatedAt()
        );
    }
}
