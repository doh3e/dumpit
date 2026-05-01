package com.dumpit.service.impl;

import com.dumpit.entity.Inquiry;
import com.dumpit.entity.User;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.InquiryRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.EmailService;
import com.dumpit.service.InquiryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InquiryServiceImpl implements InquiryService {

    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${mail.admin-notification:dumpitadmin@gmail.com}")
    private String adminNotificationEmail;

    @Override
    @Transactional
    public Inquiry submit(String email, String subject, String message) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

        Inquiry inquiry = Inquiry.of(user, email, subject, message);
        Inquiry saved = inquiryRepository.save(inquiry);

        sendUserConfirmation(email, subject, message);
        sendAdminNotification(email, subject, message);

        return saved;
    }

    @Override
    public List<Inquiry> getAllForAdmin() {
        return inquiryRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    @Transactional
    public Inquiry reply(UUID inquiryId, String adminReply) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new NotFoundException("문의를 찾을 수 없습니다."));

        inquiry.setAdminReply(adminReply);
        inquiry.setRepliedAt(LocalDateTime.now());
        inquiry.setStatus(Inquiry.Status.REPLIED);
        Inquiry saved = inquiryRepository.save(inquiry);

        sendUserReply(inquiry.getUserEmail(), inquiry.getSubject(), adminReply);
        return saved;
    }

    private void sendUserConfirmation(String to, String subject, String message) {
        String html = """
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px;">
              <h2 style="color:#222;">덤핏 문의 접수 안내</h2>
              <p>안녕하세요. 덤핏 운영팀입니다.</p>
              <p>아래 내용으로 문의가 정상 접수되었습니다. 영업일 기준 1~3일 안에 답변드리겠습니다.</p>
              <hr style="border:none; border-top:1px solid #eee;"/>
              <p><strong>제목:</strong> %s</p>
              <p><strong>내용:</strong></p>
              <pre style="white-space:pre-wrap; background:#f7f7f7; padding:12px; border-radius:8px;">%s</pre>
              <hr style="border:none; border-top:1px solid #eee;"/>
              <p style="color:#666; font-size:12px;">본 메일은 발신 전용입니다. 추가 문의는 dumpitadmin@gmail.com으로 보내주세요.</p>
            </div>
            """.formatted(escape(subject), escape(message));

        emailService.send(to, "[덤핏] 문의 접수 안내: " + subject, html);
    }

    private void sendAdminNotification(String userEmail, String subject, String message) {
        String html = """
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px;">
              <h2 style="color:#222;">신규 문의 접수</h2>
              <p><strong>유저 이메일:</strong> %s</p>
              <p><strong>제목:</strong> %s</p>
              <p><strong>내용:</strong></p>
              <pre style="white-space:pre-wrap; background:#f7f7f7; padding:12px; border-radius:8px;">%s</pre>
              <p>관리자 페이지에서 답변해주세요.</p>
            </div>
            """.formatted(escape(userEmail), escape(subject), escape(message));

        emailService.send(adminNotificationEmail, "[덤핏 관리자] 신규 문의: " + subject, html);
    }

    private void sendUserReply(String to, String subject, String reply) {
        String html = """
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px;">
              <h2 style="color:#222;">덤핏 문의 답변</h2>
              <p>안녕하세요. 덤핏 운영팀입니다.</p>
              <p>이전에 보내주신 문의에 답변드립니다.</p>
              <hr style="border:none; border-top:1px solid #eee;"/>
              <p><strong>문의 제목:</strong> %s</p>
              <p><strong>답변:</strong></p>
              <pre style="white-space:pre-wrap; background:#f7f7f7; padding:12px; border-radius:8px;">%s</pre>
              <hr style="border:none; border-top:1px solid #eee;"/>
              <p style="color:#666; font-size:12px;">추가 문의는 dumpitadmin@gmail.com으로 보내주세요.</p>
            </div>
            """.formatted(escape(subject), escape(reply));

        emailService.send(to, "[덤핏] 문의 답변: " + subject, html);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
