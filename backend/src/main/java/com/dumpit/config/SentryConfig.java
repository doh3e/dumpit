package com.dumpit.config;

import com.dumpit.exception.ApiException;
import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.SentryLevel;
import io.sentry.SentryOptions;
import io.sentry.protocol.Mechanism;
import io.sentry.protocol.SentryException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;

@Configuration
public class SentryConfig {

    @Bean
    public SentryOptions.BeforeSendCallback handledClientErrorBeforeSend() {
        return (SentryEvent event, Hint hint) -> {
            Throwable throwable = event.getThrowable();
            if (isExpectedClientError(throwable)) {
                event.setLevel(SentryLevel.WARNING);
                event.setTag("expected", "true");
                event.setTag("handled_by", "global_exception_handler");
                if (throwable instanceof ApiException apiException) {
                    event.setTag("http.status_code", String.valueOf(apiException.getStatus().value()));
                    event.setTag("error.code", apiException.getCode());
                }
                markHandled(event);
            }
            return event;
        };
    }

    private boolean isExpectedClientError(Throwable throwable) {
        if (throwable instanceof ApiException apiException) {
            return apiException.getStatus().is4xxClientError();
        }
        return throwable instanceof AccessDeniedException
                || throwable instanceof MethodArgumentNotValidException
                || throwable instanceof HttpMessageNotReadableException
                || throwable instanceof IllegalArgumentException;
    }

    private void markHandled(SentryEvent event) {
        if (event.getExceptions() == null) return;
        for (SentryException exception : event.getExceptions()) {
            Mechanism mechanism = exception.getMechanism();
            if (mechanism != null) {
                mechanism.setHandled(true);
            }
        }
    }
}
