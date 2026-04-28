package com.dumpit.service;

public interface EmailService {

    /**
     * Send a transactional email via Resend.
     *
     * @param to       recipient email address
     * @param subject  email subject
     * @param html     html body
     * @return         true if accepted by Resend, false on any failure
     */
    boolean send(String to, String subject, String html);
}
