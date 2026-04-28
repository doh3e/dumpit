package com.dumpit.dto;

import com.dumpit.entity.Inquiry;

import java.time.LocalDateTime;
import java.util.UUID;

public record InquiryResponse(
        UUID inquiryId,
        String userEmail,
        String subject,
        String message,
        String status,
        String adminReply,
        LocalDateTime repliedAt,
        LocalDateTime createdAt
) {
    public static InquiryResponse from(Inquiry inquiry) {
        return new InquiryResponse(
                inquiry.getInquiryId(),
                inquiry.getUserEmail(),
                inquiry.getSubject(),
                inquiry.getMessage(),
                inquiry.getStatus().name(),
                inquiry.getAdminReply(),
                inquiry.getRepliedAt(),
                inquiry.getCreatedAt()
        );
    }
}
