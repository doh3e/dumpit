package com.dumpit.config;

import com.dumpit.exception.ApiException;
import com.dumpit.service.AiUsageLimitExceededException;
import io.sentry.Sentry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex) {
        return error(ex.getStatus(), ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, "BAD_REQUEST", koreanBadRequestMessage(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + translateValidationMessage(fe.getDefaultMessage()))
                .reduce((a, b) -> a + ", " + b)
                .orElse("입력값이 올바르지 않습니다.");
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST_BODY", "요청 본문 형식이 올바르지 않습니다.");
    }

    @ExceptionHandler(AiUsageLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleAiUsageLimit(AiUsageLimitExceededException ex) {
        return error(HttpStatus.TOO_MANY_REQUESTS, "AI_USAGE_LIMIT_EXCEEDED", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        Sentry.captureException(ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "서버 오류가 발생했습니다.");
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("code", code);
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }

    private String koreanBadRequestMessage(String message) {
        if (message == null || message.isBlank()) return "요청값이 올바르지 않습니다.";
        return switch (message) {
            case "Unauthorized" -> "접근 권한이 없습니다.";
            case "Task not found" -> "태스크를 찾을 수 없습니다.";
            case "Idea not found" -> "아이디어를 찾을 수 없습니다.";
            case "Parent idea not found" -> "상위 아이디어를 찾을 수 없습니다.";
            case "Routine not found" -> "루틴을 찾을 수 없습니다.";
            case "BrainDump not found" -> "브레인덤프를 찾을 수 없습니다.";
            case "Notice not found" -> "공지를 찾을 수 없습니다.";
            case "User not found" -> "사용자를 찾을 수 없습니다.";
            case "Idea cannot be its own parent." -> "아이디어는 자기 자신을 상위 아이디어로 둘 수 없습니다.";
            case "A child idea cannot become this idea's parent." -> "하위 아이디어를 상위 아이디어로 지정할 수 없습니다.";
            case "Child ideas must be deleted first." -> "하위 아이디어를 먼저 삭제해주세요.";
            case "End date cannot be before start date." -> "종료일은 시작일보다 빠를 수 없습니다.";
            case "Weekly routines need at least one day between 1 and 7." -> "주간 루틴은 1~7 사이의 요일을 하나 이상 선택해야 합니다.";
            case "Monthly routines need at least one day between 1 and 31." -> "월간 루틴은 1~31 사이의 날짜를 하나 이상 선택해야 합니다.";
            default -> message;
        };
    }

    private String translateValidationMessage(String message) {
        if (message == null) return "입력값이 올바르지 않습니다.";
        return switch (message) {
            case "must not be blank" -> "비워둘 수 없습니다.";
            case "must not be null" -> "필수값입니다.";
            case "must not be empty" -> "하나 이상 입력해야 합니다.";
            default -> message;
        };
    }
}
