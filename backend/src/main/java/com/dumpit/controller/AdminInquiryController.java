package com.dumpit.controller;

import com.dumpit.dto.InquiryReplyRequest;
import com.dumpit.dto.InquiryResponse;
import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/inquiries")
@RequiredArgsConstructor
public class AdminInquiryController {

    private final InquiryService inquiryService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<InquiryResponse>> list(@AuthenticationPrincipal OAuth2User principal) {
        requireAdmin(principal);
        return ResponseEntity.ok(
                inquiryService.getAllForAdmin().stream()
                        .map(InquiryResponse::from)
                        .toList()
        );
    }

    @PatchMapping("/{inquiryId}/reply")
    public ResponseEntity<InquiryResponse> reply(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable("inquiryId") UUID inquiryId,
            @Valid @RequestBody InquiryReplyRequest req) {

        requireAdmin(principal);
        return ResponseEntity.ok(
                InquiryResponse.from(inquiryService.reply(inquiryId, req.reply()))
        );
    }

    private void requireAdmin(OAuth2User principal) {
        String email = principal.getAttribute("email");
        boolean admin = userRepository.findByEmail(email)
                .map(User::getIsAdmin)
                .orElse(false);
        if (!admin) {
            throw new AccessDeniedException("관리자 권한이 필요합니다");
        }
    }
}
