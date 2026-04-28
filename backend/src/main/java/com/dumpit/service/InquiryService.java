package com.dumpit.service;

import com.dumpit.entity.Inquiry;

import java.util.List;
import java.util.UUID;

public interface InquiryService {

    Inquiry submit(String email, String subject, String message);

    List<Inquiry> getAllForAdmin();

    Inquiry reply(UUID inquiryId, String adminReply);
}
