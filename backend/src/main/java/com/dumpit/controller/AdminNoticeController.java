package com.dumpit.controller;

import com.dumpit.dto.NoticeRequest;
import com.dumpit.dto.NoticeResponse;
import com.dumpit.entity.Notice;
import com.dumpit.entity.User;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.NoticeRepository;
import com.dumpit.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/notices")
@RequiredArgsConstructor
public class AdminNoticeController {

    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<NoticeResponse>> list(@AuthenticationPrincipal OAuth2User principal) {
        requireAdmin(principal);
        return ResponseEntity.ok(noticeRepository.findAllByOrderByPublishAtDescCreatedAtDesc().stream()
                .map(NoticeResponse::from)
                .toList());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<NoticeResponse> create(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody NoticeRequest request) {
        User admin = requireAdmin(principal);
        Notice notice = Notice.of(
                admin,
                normalizeTitle(request.title()),
                request.content().trim(),
                request.publishAt() != null ? request.publishAt() : LocalDateTime.now(),
                parseStatus(request.status())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(NoticeResponse.from(noticeRepository.save(notice)));
    }

    @PatchMapping("/{noticeId}")
    @Transactional
    public ResponseEntity<NoticeResponse> update(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID noticeId,
            @Valid @RequestBody NoticeRequest request) {
        requireAdmin(principal);
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new NotFoundException("공지를 찾을 수 없습니다."));
        notice.setTitle(normalizeTitle(request.title()));
        notice.setContent(request.content().trim());
        notice.setPublishAt(request.publishAt() != null ? request.publishAt() : notice.getPublishAt());
        notice.setStatus(parseStatus(request.status()));
        return ResponseEntity.ok(NoticeResponse.from(noticeRepository.save(notice)));
    }

    @DeleteMapping("/{noticeId}")
    @Transactional
    public ResponseEntity<Void> archive(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID noticeId) {
        requireAdmin(principal);
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new NotFoundException("공지를 찾을 수 없습니다."));
        notice.archive();
        noticeRepository.save(notice);
        return ResponseEntity.noContent().build();
    }

    private User requireAdmin(OAuth2User principal) {
        if (principal == null) {
            throw new AccessDeniedException("Admin permission is required.");
        }
        String email = principal.getAttribute("email");
        User user = userRepository.findByEmail(email)
                .filter(User::isActive)
                .orElseThrow(() -> new AccessDeniedException("Admin permission is required."));
        if (!Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new AccessDeniedException("Admin permission is required.");
        }
        return user;
    }

    private String normalizeTitle(String value) {
        String title = value.trim();
        return title.length() > 200 ? title.substring(0, 200) : title;
    }

    private Notice.Status parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return Notice.Status.PUBLISHED;
        try {
            return Notice.Status.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Notice.Status.PUBLISHED;
        }
    }
}
