package com.dumpit.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class OpenAiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String model;

    public OpenAiService(
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.model:gpt-4o-mini}") String model,
            ObjectMapper objectMapper) {

        log.info("OpenAI 서비스 초기화 - 모델: [{}], API 키 설정 여부: [{}]", model, !apiKey.isBlank());

        this.model = model;
        this.objectMapper = objectMapper;

        this.restClient = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    public PriorityResult scorePriority(String title, String description,
                                        LocalDateTime deadline, Integer estimatedMinutes) {

        String deadlineStr = deadline != null
                ? deadline.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : "없음";

        String nowStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        String urgencyInfo;
        if (deadline != null) {
            long minutesLeft = java.time.Duration.between(LocalDateTime.now(), deadline).toMinutes();
            if (minutesLeft <= 0) {
                urgencyInfo = "이미 마감이 지남 (긴급!)";
            } else if (minutesLeft <= 60) {
                urgencyInfo = "마감까지 " + minutesLeft + "분 남음 (매우 긴급)";
            } else if (minutesLeft <= 1440) {
                urgencyInfo = "마감까지 약 " + (minutesLeft / 60) + "시간 남음 (긴급)";
            } else {
                urgencyInfo = "마감까지 약 " + (minutesLeft / 1440) + "일 남음";
            }
        } else {
            urgencyInfo = "마감기한 미설정";
        }

        String prompt = """
            당신은 지능형 일정 관리 서비스 '덤핏(Dumpit)'의 우선순위 분석 엔진입니다.
            제시된 태스크를 심층 분석하여 0.0(낮음)에서 1.0(높음) 사이의 우선순위 점수를 산출하세요.

            [카테고리 분류 — 먼저 태스크가 어떤 유형인지 판단]
            A. 필수/생존형: 업무 마감, 과제 제출, 시험 준비, 면접, 계약, 납부 등 → 기본 가중치 높음
            B. 대인 약속형: 사람과의 약속, 미팅, 팀 회의, 상담 등 → 상대방이 있으므로 변경 불가, 높은 가중치
            C. 자기계발형: 공부, 독서, 운동, 자격증 준비 등 → 중간 가중치
            D. 일상/관리형: 청소, 장보기, 은행 업무 등 → 마감이 없으면 낮은 가중치
            E. 여가/유희형: 게임, 영화, 놀기, SNS 등 → 가장 낮은 가중치

            [점수 산출 기준 — 가중치 합산]
            1. 마감 긴급도 (40%%):
               - 이미 지남 → 0.95~1.0
               - 1시간 이내 → 0.85~0.95
               - 오늘 내 → 0.7~0.85
               - 1~3일 → 0.5~0.7
               - 3일 이상 → 0.2~0.5
               - 마감 없음 → 카테고리에 따라 0.1~0.4
            2. 카테고리 중요도 (30%%):
               - A(필수/생존형) → 0.8~1.0
               - B(대인 약속형) → 0.7~0.9
               - C(자기계발형) → 0.4~0.6
               - D(일상/관리형) → 0.2~0.4
               - E(여가/유희형) → 0.05~0.2
            3. 미이행 시 불이익 (20%%):
               - 금전적/학업적/직업적 불이익이 크면 높은 점수
               - 타인에게 피해가 가면 높은 점수
               - 불이익이 없으면 낮은 점수
            4. 시간 적합성 (10%%):
               - 현재 시각(%s) 기준, 집중력이 높은 시간대(오전~오후)에 어려운 과업이면 가산
               - 늦은 밤 시간대라면 가벼운 태스크에 가산

            [태스크 정보]
            - 제목: %s
            - 상세내용: %s
            - 마감기한: %s
            - 긴급도: %s
            - 예상소요시간: %s분

            반드시 {"score": 실수, "reason": "문자열"} 형식의 JSON으로만 응답하세요.
            reason에는 카테고리 판단과 점수 산출 근거를 간결하게 작성하세요.
            """.formatted(nowStr, title, description != null ? description : "내용 없음",
                    deadlineStr, urgencyInfo,
                    estimatedMinutes != null ? estimatedMinutes : "미정");

        try {
            String json = callChatApi(prompt, "태스크 우선순위를 정밀하게 분석하는 어시스턴트입니다.");
            return objectMapper.readValue(json, PriorityResult.class);
        } catch (Exception e) {
            log.error("우선순위 분석 실패: {}", e.getMessage());
            return new PriorityResult(0.5, "AI 분석 오류로 인한 기본값 할당");
        }
    }

    public BrainDumpResult analyzeBrainDump(String rawText) {

        String prompt = """
            당신은 '덤핏(Dumpit)'의 브레인 덤프 분석가입니다. 유저의 무작위 줄글을 분석하여 실행 가능한 단위로 분리하세요.

            [분석 가이드]
            1. 마이크로 태스킹: 큰 규모의 업무는 5개 이하의 작은 태스크로 쪼개세요.
            2. 성격 파악: 대면 약속, 생계형 업무, 단순 취미를 구분하여 우선순위 점수(0.0~1.0)를 매깁니다.
            3. 시간 추출: 문맥에서 예상 소요 시간과 기한을 최대한 추론하세요.

            [입력 텍스트]
            "%s"

            반드시 {"tasks": [{"title": "...", "description": "...", "deadline": "YYYY-MM-DD HH:mm", "estimatedMinutes": 60, "priorityScore": 0.8}]} 형식의 JSON으로 응답하세요.
            """.formatted(rawText);

        try {
            String json = callChatApi(prompt, "줄글을 할 일 리스트로 분리하고 우선순위를 산출하는 전문가입니다.");
            return objectMapper.readValue(json, BrainDumpResult.class);
        } catch (Exception e) {
            log.error("브레인 덤프 분석 실패: {}", e.getMessage());
            throw new RuntimeException("AI 분석 중 오류가 발생했습니다.");
        }
    }

    private String callChatApi(String userPrompt, String systemPrompt) {

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.3,
                "response_format", Map.of("type", "json_object")
        );

        try {
            String raw = restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            ChatResponse response = objectMapper.readValue(raw, ChatResponse.class);
            return response.choices().get(0).message().content();

        } catch (RestClientResponseException e) {
            log.error("OpenAI API 에러 - 상태코드: {}, 응답본문: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("OpenAI 서비스 응답 에러");
        } catch (Exception e) {
            log.error("OpenAI 호출 중 예외 발생", e);
            throw new RuntimeException("AI 연결 실패");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PriorityResult(double score, String reason) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrainDumpResult(List<BrainDumpTask> tasks) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrainDumpTask(
            String title,
            String description,
            String deadline,
            Integer estimatedMinutes,
            Double priorityScore
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatResponse(List<Choice> choices) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Choice(Message message) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String role, String content) {}
}
