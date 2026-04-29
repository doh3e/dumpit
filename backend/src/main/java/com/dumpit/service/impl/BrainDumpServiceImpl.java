package com.dumpit.service.impl;

import com.dumpit.entity.BrainDump;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.AiUsageService;
import com.dumpit.service.BrainDumpService;
import com.dumpit.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BrainDumpServiceImpl implements BrainDumpService {

    private final BrainDumpRepository brainDumpRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final OpenAiService openAiService;
    private final AiUsageService aiUsageService;

    @Override
    @Transactional
    public BrainDumpResult analyze(String email, String rawText) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("?좎?瑜?李얠쓣 ???놁뒿?덈떎"));

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

        List<Task> tasks = new ArrayList<>();
        for (OpenAiService.BrainDumpTask aiTask : aiResult.tasks()) {
            LocalDateTime deadline = parseDeadline(aiTask.deadline());

            Task task = Task.of(user, aiTask.title(), aiTask.description(),
                    deadline, aiTask.estimatedMinutes());
            task.setBrainDump(dump);
            task.setAiPriorityScore(aiTask.priorityScore() != null ? aiTask.priorityScore() : 0.5);
            task.setCategory(parseCategory(aiTask.category()));

            tasks.add(taskRepository.save(task));
        }

        dump.markAnalyzed();
        brainDumpRepository.save(dump);

        return new BrainDumpResult(dump.getDumpId(), tasks);
    }

    private Task.Category parseCategory(String raw) {
        if (raw == null || raw.isBlank()) return Task.Category.OTHER;
        try {
            return Task.Category.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Task.Category.OTHER;
        }
    }

    private LocalDateTime parseDeadline(String deadlineStr) {
        if (deadlineStr == null || deadlineStr.isBlank() || "null".equals(deadlineStr)) {
            return null;
        }
        try {
            return LocalDateTime.parse(deadlineStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            log.warn("留덇컧???뚯떛 ?ㅽ뙣: {}", deadlineStr);
            return null;
        }
    }
}
