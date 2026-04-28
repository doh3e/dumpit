package com.dumpit.controller;

import com.dumpit.dto.InquiryRequest;
import com.dumpit.dto.InquiryResponse;
import com.dumpit.entity.Inquiry;
import com.dumpit.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping
    public ResponseEntity<InquiryResponse> submit(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody InquiryRequest req) {

        Inquiry inquiry = inquiryService.submit(
                principal.getAttribute("email"),
                req.subject(),
                req.message()
        );
        return ResponseEntity.ok(InquiryResponse.from(inquiry));
    }
}
