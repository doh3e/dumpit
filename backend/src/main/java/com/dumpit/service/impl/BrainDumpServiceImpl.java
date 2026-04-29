package com.dumpit.service.impl;

import com.dumpit.dto.DumpConfirmRequest;
import com.dumpit.entity.BrainDump;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.AiUsageService;
import com.dumpit.service.BrainDumpService;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
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

    @Override
    @Transactional
    public BrainDumpResult analyze(String email, String rawText) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

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
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        BrainDump dump = brainDumpRepository.findById(dumpId)
                .orElseThrow(() -> new IllegalArgumentException("BrainDump not found"));

        if (!dump.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Unauthorized");
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
}
