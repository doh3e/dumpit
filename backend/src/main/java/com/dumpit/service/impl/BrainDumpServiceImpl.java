package com.dumpit.service.impl;

import com.dumpit.dto.DumpConfirmRequest;
import com.dumpit.entity.BrainDump;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.exception.ForbiddenException;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.ActivityLogService;
import com.dumpit.service.AiUsageService;
import com.dumpit.service.BrainDumpService;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BrainDumpServiceImpl implements BrainDumpService {

    private final BrainDumpRepository brainDumpRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final OpenAiService openAiService;
    private final AiUsageService aiUsageService;
    private final DeadlineNudgeService deadlineNudgeService;
    private final ActivityLogService activityLogService;

    @Override
    @Transactional
    public BrainDumpResult analyze(String email, String rawText) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

        BrainDump dump = BrainDump.of(user, rawText);
        brainDumpRepository.save(dump);

        aiUsageService.consume(email, AiUsageService.UsageType.BRAIN_DUMP);

        OpenAiService.BrainDumpResult aiResult;
        try {
            aiResult = openAiService.analyzeBrainDump(rawText);
        } catch (Exception e) {
            dump.markFailed();
            brainDumpRepository.save(dump);
            throw e;
        }

        dump.markAnalyzed();
        brainDumpRepository.save(dump);

        return new BrainDumpResult(dump.getDumpId(), aiResult.tasks());
    }

    @Override
    @Transactional
    public List<Task> confirm(String email, UUID dumpId, List<DumpConfirmRequest.TaskInput> inputs) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

        BrainDump dump = brainDumpRepository.findById(dumpId)
                .orElseThrow(() -> new NotFoundException("브레인덤프를 찾을 수 없습니다."));

        if (!dump.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 브레인덤프에 접근할 권한이 없습니다.");
        }

        List<Task> saved = new ArrayList<>();
        for (DumpConfirmRequest.TaskInput input : inputs) {
            if (input.title() == null || input.title().isBlank()) continue;

            Task task = Task.of(user, input.title().trim(),
                    input.description() != null ? input.description().trim() : null,
                    input.deadline(), input.estimatedMinutes());
            task.setBrainDump(dump);
            task.setAiPriorityScore(input.priorityScore() != null ? input.priorityScore() : 0.5);
            task.setCategory(parseCategory(input.category()));

            Task t = taskRepository.save(task);
            deadlineNudgeService.index(t);
            activityLogService.record(user, "TASK_CREATED", "TASK", t.getTaskId(), null, taskSnapshot(t));
            saved.add(t);
        }
        return saved;
    }

    private Task.Category parseCategory(String raw) {
        if (raw == null || raw.isBlank()) return Task.Category.OTHER;
        try {
            return Task.Category.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Task.Category.OTHER;
        }
    }

    private Map<String, Object> taskSnapshot(Task task) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("taskId", task.getTaskId());
        values.put("title", task.getTitle());
        values.put("description", task.getDescription());
        values.put("status", task.getStatus());
        values.put("category", task.getCategory());
        values.put("deadline", task.getDeadline());
        values.put("estimatedMinutes", task.getEstimatedMinutes());
        values.put("aiPriorityScore", task.getAiPriorityScore());
        values.put("brainDumpId", task.getBrainDump() != null ? task.getBrainDump().getDumpId() : null);
        values.put("deletedAt", task.getDeletedAt());
        return values;
    }
}
