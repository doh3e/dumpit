package com.dumpit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InquiryRequest(
        @NotBlank @Size(max = 200) String subject,
        @NotBlank @Size(max = 5000) String message
) {}
