package com.dumpit.config;

import com.dumpit.push.FcmPushSender;
import com.dumpit.push.LoggingPushSender;
import com.dumpit.push.PushSender;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;

@Configuration
public class FirebaseConfig {

    /** app.push.credentials(서비스 계정 키 경로)가 설정된 환경에서만 실발송 활성 */
    @Bean
    @ConditionalOnProperty("app.push.credentials")
    public FirebaseApp firebaseApp(@Value("${app.push.credentials}") String credentialsPath) throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) return FirebaseApp.getInstance();
        try (FileInputStream in = new FileInputStream(credentialsPath)) {
            return FirebaseApp.initializeApp(FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(in))
                    .build());
        }
    }

    @Bean
    @ConditionalOnBean(FirebaseApp.class)
    public PushSender fcmPushSender(FirebaseApp app) {
        return new FcmPushSender(FirebaseMessaging.getInstance(app));
    }

    @Bean
    @ConditionalOnMissingBean(PushSender.class)
    public PushSender loggingPushSender() {
        return new LoggingPushSender();
    }
}
