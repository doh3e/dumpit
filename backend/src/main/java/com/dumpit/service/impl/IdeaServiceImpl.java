package com.dumpit.service.impl;

import com.dumpit.entity.Idea;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.exception.BadRequestException;
import com.dumpit.exception.ForbiddenException;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.ActivityLogService;
import com.dumpit.service.AiUsageService;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.IdeaService;
import com.dumpit.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IdeaServiceImpl implements IdeaService {

    private final IdeaRepository ideaRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final DeadlineNudgeService deadlineNudgeService;
    private final ActivityLogService activityLogService;
    private final AiUsageService aiUsageService;
    private final OpenAiService openAiService;

    @Override
    @Transactional(readOnly = true)
    public List<Idea> getIdeas(String email) {
        return ideaRepository.findByUserAndDeletedAtIsNullOrderByPinnedDescUpdatedAtDesc(findUser(email));
    }

    @Override
    @Transactional
    public Idea createIdea(String email, String title, String content, Boolean pinned,
                           Task.Category category, UUID parentIdeaId) {
        User user = findUser(email);
        Idea parent = findParentIdea(user, parentIdeaId);
        Idea idea = Idea.of(user, title.trim(), trimToNull(content));
        idea.update(null, null, pinned, categoryOrDefault(category), parent);

        Idea saved = ideaRepository.save(idea);
        activityLogService.record(user, "IDEA_CREATED", "IDEA", saved.getIdeaId(), null, snapshot(saved));
        return saved;
    }

    @Override
    @Transactional
    public List<Idea> createIdeasFromLines(String email, String rawText, Task.Category category, UUID parentIdeaId) {
        User user = findUser(email);
        Idea parent = findParentIdea(user, parentIdeaId);
        List<Idea> created = new ArrayList<>();

        for (String line : rawText.split("\\R")) {
            String title = normalizeLineTitle(line);
            if (title == null) continue;

            Idea idea = Idea.of(user, title, null);
            idea.update(null, null, false, categoryOrDefault(category), parent);
            Idea saved = ideaRepository.save(idea);
            activityLogService.record(user, "IDEA_CREATED", "IDEA", saved.getIdeaId(), null, snapshot(saved));
            created.add(saved);
        }

        return created;
    }

    @Override
    @Transactional
    public Idea updateIdea(String email, UUID ideaId, String title, String content, Boolean pinned,
                           Task.Category category, UUID parentIdeaId) {
        Idea idea = findOwnedIdea(email, ideaId);
        Idea parent = findParentIdea(idea.getUser(), parentIdeaId);
        if (parent != null && parent.getIdeaId().equals(idea.getIdeaId())) {
            throw new BadRequestException("아이디어는 자기 자신을 상위 아이디어로 둘 수 없습니다.");
        }
        if (parent != null && isDescendant(parent, idea)) {
            throw new BadRequestException("하위 아이디어를 상위 아이디어로 지정할 수 없습니다.");
        }

        Map<String, Object> before = snapshot(idea);
        idea.update(trimToNull(title), content, pinned, category, parent);
        Idea saved = ideaRepository.save(idea);
        activityLogService.record(idea.getUser(), "IDEA_UPDATED", "IDEA", saved.getIdeaId(), before, snapshot(saved));
        return saved;
    }

    @Override
    @Transactional
    public Task convertToTask(String email, UUID ideaId) {
        Idea idea = findOwnedIdea(email, ideaId);
        if (idea.getConvertedTask() != null && idea.getConvertedTask().getDeletedAt() == null) {
            return idea.getConvertedTask();
        }

        Map<String, Object> before = snapshot(idea);
        Task task = Task.of(idea.getUser(), idea.getTitle(), idea.getContent(), null, null);
        aiUsageService.consume(email, AiUsageService.UsageType.TASK_PRIORITY);
        OpenAiService.PriorityResult priority =
                openAiService.scorePriority(idea.getTitle(), idea.getContent(), null, null);
        task.setAiPriorityScore(priority.score());
        task.setCategory(idea.getCategory() != Task.Category.OTHER
                ? idea.getCategory()
                : parseCategory(priority.category()));

        Task saved = taskRepository.save(task);
        deadlineNudgeService.index(saved);
        activityLogService.record(idea.getUser(), "TASK_CREATED", "TASK", saved.getTaskId(), null, taskSnapshot(saved));

        idea.markConverted(saved);
        ideaRepository.save(idea);
        activityLogService.record(idea.getUser(), "IDEA_CONVERTED", "IDEA", idea.getIdeaId(), before, snapshot(idea));
        return saved;
    }

    @Override
    @Transactional
    public void deleteIdea(String email, UUID ideaId) {
        Idea idea = findOwnedIdea(email, ideaId);
        if (ideaRepository.existsByParentIdeaAndDeletedAtIsNull(idea)) {
            throw new BadRequestException("하위 아이디어를 먼저 삭제해주세요.");
        }

        Map<String, Object> before = snapshot(idea);
        idea.markDeleted();
        Idea saved = ideaRepository.save(idea);
        activityLogService.record(idea.getUser(), "IDEA_DELETED", "IDEA", saved.getIdeaId(), before, snapshot(saved));
    }

    private Idea findOwnedIdea(String email, UUID ideaId) {
        Idea idea = ideaRepository.findActiveById(ideaId)
                .orElseThrow(() -> new NotFoundException("아이디어를 찾을 수 없습니다."));

        if (!idea.getUser().getEmail().equals(email)) {
            throw new ForbiddenException("이 아이디어에 접근할 권한이 없습니다.");
        }

        return idea;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }

    private Idea findParentIdea(User user, UUID parentIdeaId) {
        if (parentIdeaId == null) return null;
        Idea parent = ideaRepository.findActiveById(parentIdeaId)
                .orElseThrow(() -> new NotFoundException("상위 아이디어를 찾을 수 없습니다."));
        if (!parent.getUser().getUserId().equals(user.getUserId())) {
            throw new ForbiddenException("이 아이디어에 접근할 권한이 없습니다.");
        }
        return parent;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Task.Category categoryOrDefault(Task.Category category) {
        return category != null ? category : Task.Category.OTHER;
    }

    private Task.Category parseCategory(String raw) {
        if (raw == null || raw.isBlank()) return Task.Category.OTHER;
        try {
            return Task.Category.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Task.Category.OTHER;
        }
    }

    private String normalizeLineTitle(String value) {
        if (value == null) return null;
        String title = value.trim()
                .replaceFirst("^[-*]\\s+", "")
                .replaceFirst("^\\d+[.)]\\s+", "")
                .trim();
        if (title.isEmpty()) return null;
        return title.length() > 200 ? title.substring(0, 200) : title;
    }

    private boolean isDescendant(Idea candidateParent, Idea idea) {
        Idea cursor = candidateParent.getParentIdea();
        while (cursor != null) {
            if (cursor.getIdeaId().equals(idea.getIdeaId())) return true;
            cursor = cursor.getParentIdea();
        }
        return false;
    }

    private Map<String, Object> snapshot(Idea idea) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("ideaId", idea.getIdeaId());
        values.put("title", idea.getTitle());
        values.put("content", idea.getContent());
        values.put("category", idea.getCategory());
        values.put("pinned", idea.getPinned());
        values.put("parentIdeaId", idea.getParentIdea() != null ? idea.getParentIdea().getIdeaId() : null);
        values.put("convertedTaskId", idea.getConvertedTask() != null ? idea.getConvertedTask().getTaskId() : null);
        values.put("convertedAt", idea.getConvertedAt());
        values.put("deletedAt", idea.getDeletedAt());
        return values;
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
        values.put("deletedAt", task.getDeletedAt());
        return values;
    }
}
