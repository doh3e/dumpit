package com.dumpit.service;

import com.dumpit.common.ActiveHours;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.List;

public interface OpenAiService {

    // userMemory: 유저가 저장한 AI 메모리(<user_context> 주입용) — 없으면 null 허용
    PriorityResult scorePriority(String title, String description,
                                 LocalDateTime deadline, Integer estimatedMinutes,
                                 String userMemory);

    ScheduleInferenceResult inferSchedule(String title, String description,
                                          LocalDateTime startTime,
                                          LocalDateTime deadline,
                                          Integer estimatedMinutes,
                                          ActiveHours activeHours,
                                          String userMemory);

    SubtaskResult proposeSubtasks(String title, String description, Integer estimatedMinutes,
                                  String userMemory);

    BrainDumpResult analyzeBrainDump(String rawText, ActiveHours activeHours, String userMemory);

    IdeaExtractResult extractIdeas(String rawText, String userMemory);

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PriorityResult(double score, String category, String reason) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ScheduleInferenceResult(
            String startTime,
            String deadline,
            Integer estimatedMinutes,
            String reason
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record BrainDumpResult(List<BrainDumpTask> tasks) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record IdeaExtractResult(List<IdeaNode> ideas) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record IdeaNode(String title, String content, String category, List<IdeaNode> children) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SubtaskResult(List<SubtaskProposal> subtasks) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SubtaskProposal(
            String title,
            String description,
            Integer estimatedMinutes
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record BrainDumpTask(
            String title,
            String description,
            String deadline,
            Integer estimatedMinutes,
            Double priorityScore,
            String category
    ) {}
}
