package com.dumpit.service.impl;

import com.dumpit.service.OpenAiService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class OpenAiServiceImpl implements OpenAiService {

    private static final DateTimeFormatter DISPLAY_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String model;

    public OpenAiServiceImpl(
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.model:gpt-4o-mini}") String model,
            ObjectMapper objectMapper) {

        log.info("Initializing OpenAI service with model [{}], api key configured: [{}]", model, !apiKey.isBlank());

        this.model = model;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public PriorityResult scorePriority(String title, String description,
                                        LocalDateTime deadline, Integer estimatedMinutes) {
        String deadlineStr = deadline != null ? deadline.format(DISPLAY_FORMAT) : "none";
        String nowStr = LocalDateTime.now().format(DISPLAY_FORMAT);
        String urgencyInfo = buildUrgencyInfo(deadline);

        String prompt = """
            You are the priority analysis engine for the Dumpit task management app.
            Analyze the task and return only valid JSON in this shape:
            {"score": 0.0_to_1.0, "category": "WORK|STUDY|APPOINTMENT|CHORE|ROUTINE|HEALTH|HOBBY|OTHER", "reason": "short explanation"}

            Scoring guidance:
            - Consider urgency, importance, likely impact, and timing.
            - Higher score means higher priority.
            - If the task is unclear, use a reasonable default.

            Category rules:
            - WORK: job, project, reporting, office tasks
            - STUDY: class, exam prep, homework, certification study
            - APPOINTMENT: meetings, reservations, interviews, fixed-time commitments
            - CHORE: cleaning, shopping, errands, home maintenance
            - ROUTINE: recurring habits and repeated personal upkeep
            - HEALTH: exercise, hospital visits, medication, wellness
            - HOBBY: games, entertainment, leisure, social fun
            - OTHER: anything not clearly matching the above

            Current time: %s
            Title: %s
            Description: %s
            Deadline: %s
            Urgency summary: %s
            Estimated minutes: %s
            """.formatted(
                nowStr,
                title,
                description != null ? description : "none",
                deadlineStr,
                urgencyInfo,
                estimatedMinutes != null ? estimatedMinutes : "unknown"
        );

        try {
            String json = callChatApi(prompt, "Return strict JSON only.");
            return objectMapper.readValue(json, PriorityResult.class);
        } catch (Exception e) {
            log.error("Priority analysis failed: {}", e.getMessage());
            return new PriorityResult(0.5, "OTHER", "Fallback used because AI analysis failed.");
        }
    }

    @Override
    public SubtaskResult proposeSubtasks(String title, String description, Integer estimatedMinutes) {
        String prompt = """
            You break a task into actionable subtasks for the Dumpit app.
            Return only valid JSON in this shape:
            {"subtasks":[{"title":"...", "description":"...", "estimatedMinutes":30}]}

            Rules:
            - Produce 3 to 5 subtasks when possible.
            - Each subtask should be concrete and independently actionable.
            - Keep titles short and clear.
            - Keep descriptions brief. Use an empty string if not needed.
            - Distribute total time realistically based on the parent task.

            Parent title: %s
            Parent description: %s
            Parent estimated minutes: %s
            """.formatted(
                title,
                description != null ? description : "none",
                estimatedMinutes != null ? estimatedMinutes : "unknown"
        );

        try {
            String json = callChatApi(prompt, "Return strict JSON only.");
            return objectMapper.readValue(json, SubtaskResult.class);
        } catch (Exception e) {
            log.error("Subtask proposal failed: {}", e.getMessage());
            throw new RuntimeException("AI subtask generation failed.");
        }
    }

    @Override
    public BrainDumpResult analyzeBrainDump(String rawText) {
        String prompt = """
            You analyze a brain dump for the Dumpit productivity app.
            Extract actionable tasks and return only valid JSON in this shape:
            {"tasks":[{"title":"...", "description":"...", "deadline":"YYYY-MM-DDTHH:mm:ss", "estimatedMinutes":60, "priorityScore":0.8, "category":"WORK"}]}

            Rules:
            - Split large or vague thoughts into practical tasks.
            - Use null or omit meaningfully impossible values, but keep valid JSON.
            - priorityScore must be between 0.0 and 1.0.
            - category must be one of WORK, STUDY, APPOINTMENT, CHORE, ROUTINE, HEALTH, HOBBY, OTHER.
            - Focus on tasks that a user can actually execute.

            Brain dump:
            %s
            """.formatted(rawText);

        try {
            String json = callChatApi(prompt, "Return strict JSON only.");
            return objectMapper.readValue(json, BrainDumpResult.class);
        } catch (Exception e) {
            log.error("Brain dump analysis failed: {}", e.getMessage());
            throw new RuntimeException("AI brain dump analysis failed.");
        }
    }

    private String buildUrgencyInfo(LocalDateTime deadline) {
        if (deadline == null) {
            return "No deadline provided";
        }

        long minutesLeft = Duration.between(LocalDateTime.now(), deadline).toMinutes();
        if (minutesLeft <= 0) {
            return "Deadline already passed";
        }
        if (minutesLeft <= 60) {
            return "Due within 1 hour";
        }
        if (minutesLeft <= 1_440) {
            return "Due within 24 hours";
        }
        return "Due in " + (minutesLeft / 1_440) + " days";
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
            log.error("OpenAI API error - status: {}, body: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("OpenAI service response error");
        } catch (Exception e) {
            log.error("Unexpected error while calling OpenAI", e);
            throw new RuntimeException("AI connection failed");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatResponse(List<Choice> choices) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Choice(Message message) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String role, String content) {}
}
