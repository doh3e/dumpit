package com.dumpit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InquiryReplyRequest(
        @NotBlank @Size(max = 3000) String reply
) {}
