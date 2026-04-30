package com.dumpit.controller;

import com.dumpit.dto.NoticeResponse;
import com.dumpit.entity.Notice;
import com.dumpit.entity.NoticeRead;
import com.dumpit.entity.User;
import com.dumpit.repository.NoticeReadRepository;
import com.dumpit.repository.NoticeRepository;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeRepository noticeRepository;
    private final NoticeReadRepository noticeReadRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<NoticeResponse>> list(@AuthenticationPrincipal OAuth2User principal) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(noticeRepository.findPublished(LocalDateTime.now()).stream()
                .map(NoticeResponse::from)
                .toList());
    }

    @GetMapping("/unread")
    public ResponseEntity<List<NoticeResponse>> unread(@AuthenticationPrincipal OAuth2User principal) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(noticeReadRepository.findUnreadPublished(user, LocalDateTime.now()).stream()
                .map(NoticeResponse::from)
                .toList());
    }

    @PostMapping("/{noticeId}/read")
    @Transactional
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID noticeId) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(401).build();
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("Notice not found"));
        if (!noticeReadRepository.existsByNoticeAndUser(notice, user)) {
            noticeReadRepository.save(NoticeRead.of(notice, user));
        }
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(OAuth2User principal) {
        if (principal == null) return null;
        String email = principal.getAttribute("email");
        return userRepository.findByEmail(email)
                .filter(User::isActive)
                .orElse(null);
    }
}
