package com.dumpit.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.List;

public interface OpenAiService {

    PriorityResult scorePriority(String title, String description,
                                 LocalDateTime deadline, Integer estimatedMinutes);

    SubtaskResult proposeSubtasks(String title, String description, Integer estimatedMinutes);

    BrainDumpResult analyzeBrainDump(String rawText);

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PriorityResult(double score, String category, String reason) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record BrainDumpResult(List<BrainDumpTask> tasks) {}

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
