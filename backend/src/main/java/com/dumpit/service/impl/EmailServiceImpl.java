package com.dumpit.service.impl;

import com.dumpit.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    private final RestClient restClient;
    private final String apiKey;
    private final String fromAddress;
    private final boolean enabled;

    public EmailServiceImpl(
            @Value("${mail.resend.api-key:}") String apiKey,
            @Value("${mail.from:onboarding@resend.dev}") String fromAddress) {

        this.apiKey = apiKey;
        this.fromAddress = fromAddress;
        this.enabled = !apiKey.isBlank();

        log.info("Email service initialized: enabled={}, from={}", enabled, fromAddress);

        this.restClient = RestClient.builder()
                .baseUrl("https://api.resend.com")
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public boolean send(String to, String subject, String html) {
        if (!enabled) {
            log.warn("Email send skipped (RESEND_API_KEY not configured): to={}, subject={}", to, subject);
            return false;
        }

        Map<String, Object> body = Map.of(
                "from", fromAddress,
                "to", to,
                "subject", subject,
                "html", html
        );

        try {
            restClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Email sent: to={}, subject={}", to, subject);
            return true;

        } catch (RestClientResponseException e) {
            log.error("Resend API error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("Email send failed: {}", e.getMessage(), e);
            return false;
        }
    }
}
