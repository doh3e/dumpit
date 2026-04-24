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
            제시된 태스크를 심층 분석하여 0.0(낮음)에서 1.0(높음) 사이의 우선순위 점수와 카테고리를 산출하세요.

            [카테고리 분류 — 다음 8개 중 정확히 하나 선택]
            - WORK: 업무, 회사 일, 프로젝트, 마감, 보고서 등 직업적 업무
            - STUDY: 공부, 과제, 시험 준비, 강의 수강, 자격증 준비 등 학업
            - APPOINTMENT: 중요한 사람과의 약속, 미팅, 면접, 병원 예약, 상담 등 시간이 정해진 약속
            - CHORE: 청소, 빨래, 장보기, 설거지, 정리 등 집안일
            - ROUTINE: 매일/매주 반복하는 습관, 일기, 약 복용, 출석 체크 등
            - HEALTH: 운동, 병원 방문, 약 먹기, 건강 관리, 재활 등 건강 관련
            - HOBBY: 게임, 영화 감상, 독서(취미), SNS, 친구와의 활동, 여가 활동
            - OTHER: 위 어디에도 명확히 속하지 않는 경우

            [점수 산출 기준 — 가중치 합산]
            1. 마감 긴급도 (30%%):
               - 이미 지남 → 0.95~1.0
               - 1시간 이내 → 0.85~0.95
               - 오늘 내 → 0.7~0.85
               - 1~3일 → 0.5~0.7
               - 3일 이상 → 0.2~0.5
               - 마감 없음 → 카테고리에 따라 0.1~0.4
            2. 카테고리 중요도 (40%%):
               - WORK, STUDY, APPOINTMENT → 0.7~1.0 (직업/학업/대인 약속은 높게)
               - HEALTH → 0.6~0.9 (건강은 중요하지만 개인 루틴이면 중간)
               - ROUTINE, CHORE → 0.2~0.5
               - HOBBY → 0.05~0.2
               - OTHER → 문맥에 따라 0.2~0.5
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

            반드시 {"score": 실수, "category": "카테고리_영문_상수", "reason": "문자열"} 형식의 JSON으로만 응답하세요.
            category 필드는 반드시 위 8개 중 하나(WORK/STUDY/APPOINTMENT/CHORE/ROUTINE/HEALTH/HOBBY/OTHER)여야 합니다.
            reason에는 카테고리 판단과 점수 산출 근거를 간결하게 작성하세요.
            """.formatted(nowStr, title, description != null ? description : "내용 없음",
                    deadlineStr, urgencyInfo,
                    estimatedMinutes != null ? estimatedMinutes : "미정");

        try {
            String json = callChatApi(prompt, "태스크 우선순위를 정밀하게 분석하는 어시스턴트입니다.");
            return objectMapper.readValue(json, PriorityResult.class);
        } catch (Exception e) {
            log.error("우선순위 분석 실패: {}", e.getMessage());
            return new PriorityResult(0.5, "OTHER", "AI 분석 오류로 인한 기본값 할당");
        }
    }

    public SubtaskResult proposeSubtasks(String title, String description, Integer estimatedMinutes) {
        String prompt = """
            당신은 '덤핏(Dumpit)'의 태스크 분할 전문가입니다. 큰 단위의 할 일을 실행 가능한 작은 단위로 쪼개세요.

            [분할 가이드]
            1. 3~5개의 서브태스크로 나누세요. 너무 잘게 쪼개지 말고 의미 있는 단위로.
            2. 각 서브태스크는 단독으로 시작/완료가 가능해야 합니다.
            3. 시간순/작업 흐름상 논리적 순서로 배열하세요.
            4. 각 서브태스크에 예상 소요시간을 분 단위로 추론하세요.
            5. 부모 태스크의 예상 시간(%s분)을 합리적으로 분배하세요.

            [원본 태스크]
            - 제목: %s
            - 상세: %s

            반드시 {"subtasks": [{"title": "...", "description": "...", "estimatedMinutes": 30}]} 형식의 JSON으로 응답하세요.
            description은 간결하게 한 줄로, 없으면 빈 문자열로 두세요.
            """.formatted(
                    estimatedMinutes != null ? estimatedMinutes : "미정",
                    title,
                    description != null ? description : "내용 없음");

        try {
            String json = callChatApi(prompt, "큰 태스크를 실행 가능한 작은 서브태스크로 분할하는 전문가입니다.");
            return objectMapper.readValue(json, SubtaskResult.class);
        } catch (Exception e) {
            log.error("태스크 분할 실패: {}", e.getMessage());
            throw new RuntimeException("AI 분할 중 오류가 발생했습니다.");
        }
    }

    public BrainDumpResult analyzeBrainDump(String rawText) {

        String prompt = """
            당신은 '덤핏(Dumpit)'의 브레인 덤프 분석가입니다. 유저의 무작위 줄글을 분석하여 실행 가능한 단위로 분리하세요.

            [분석 가이드]
            1. 마이크로 태스킹: 큰 규모의 업무는 5개 이하의 작은 태스크로 쪼개세요.
            2. 성격 파악: 대면 약속, 생계형 업무, 단순 취미를 구분하여 우선순위 점수(0.0~1.0)를 매깁니다.
            3. 시간 추출: 문맥에서 예상 소요 시간과 기한을 최대한 추론하세요.
            4. 카테고리 분류: 각 태스크를 다음 8개 중 정확히 하나로 분류하세요.
               - WORK: 업무, 회사 일, 프로젝트, 보고서 등
               - STUDY: 공부, 과제, 시험 준비, 강의 수강, 자격증 등
               - APPOINTMENT: 사람과의 약속, 미팅, 면접, 예약된 상담 등
               - CHORE: 청소, 빨래, 장보기, 설거지 등 집안일
               - ROUTINE: 반복 습관, 일기, 약 복용, 출석 체크 등
               - HEALTH: 운동, 병원 방문, 건강 관리 등
               - HOBBY: 게임, 영화, 취미 활동, SNS 등
               - OTHER: 위 어디에도 명확히 속하지 않는 경우

            [입력 텍스트]
            "%s"

            반드시 {"tasks": [{"title": "...", "description": "...", "deadline": "YYYY-MM-DD HH:mm", "estimatedMinutes": 60, "priorityScore": 0.8, "category": "WORK"}]} 형식의 JSON으로 응답하세요.
            category 필드는 반드시 WORK/STUDY/APPOINTMENT/CHORE/ROUTINE/HEALTH/HOBBY/OTHER 중 하나여야 합니다.
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
    public record PriorityResult(double score, String category, String reason) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrainDumpResult(List<BrainDumpTask> tasks) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SubtaskResult(List<SubtaskProposal> subtasks) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SubtaskProposal(
            String title,
            String description,
            Integer estimatedMinutes
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrainDumpTask(
            String title,
            String description,
            String deadline,
            Integer estimatedMinutes,
            Double priorityScore,
            String category
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatResponse(List<Choice> choices) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Choice(Message message) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String role, String content) {}
}
