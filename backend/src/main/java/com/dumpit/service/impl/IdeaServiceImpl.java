package com.dumpit.service.impl;

import com.dumpit.entity.Idea;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.IdeaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IdeaServiceImpl implements IdeaService {

    private final IdeaRepository ideaRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final DeadlineNudgeService deadlineNudgeService;

    @Override
    @Transactional(readOnly = true)
    public List<Idea> getIdeas(String email) {
        return ideaRepository.findByUserOrderByPinnedDescUpdatedAtDesc(findUser(email));
    }

    @Override
    @Transactional
    public Idea createIdea(String email, String title, String content, Boolean pinned,
                           Task.Category category, UUID parentIdeaId) {
        User user = findUser(email);
        Idea parent = findParentIdea(user, parentIdeaId);
        Idea idea = Idea.of(user, title.trim(), trimToNull(content));
        idea.update(null, null, pinned, categoryOrDefault(category), parent);
        return ideaRepository.save(idea);
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
            created.add(ideaRepository.save(idea));
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
            throw new IllegalArgumentException("아이디어를 자기 자신의 하위로 둘 수 없습니다");
        }
        if (parent != null && isDescendant(parent, idea)) {
            throw new IllegalArgumentException("하위 아이디어를 상위 아이디어로 지정할 수 없습니다");
        }
        idea.update(trimToNull(title), content, pinned, category, parent);
        return ideaRepository.save(idea);
    }

    @Override
    @Transactional
    public Task convertToTask(String email, UUID ideaId) {
        Idea idea = findOwnedIdea(email, ideaId);
        if (idea.getConvertedTask() != null) {
            return idea.getConvertedTask();
        }

        Task task = Task.of(idea.getUser(), idea.getTitle(), idea.getContent(), null, null);
        task.setCategory(idea.getCategory());
        task.setAiPriorityScore(0.5);

        Task saved = taskRepository.save(task);
        deadlineNudgeService.index(saved);
        idea.markConverted(saved);
        ideaRepository.save(idea);
        return saved;
    }

    @Override
    @Transactional
    public void deleteIdea(String email, UUID ideaId) {
        Idea idea = findOwnedIdea(email, ideaId);
        if (ideaRepository.existsByParentIdea(idea)) {
            throw new IllegalArgumentException("하위 아이디어가 있어 삭제할 수 없습니다");
        }
        ideaRepository.delete(idea);
    }

    private Idea findOwnedIdea(String email, UUID ideaId) {
        Idea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new IllegalArgumentException("아이디어를 찾을 수 없습니다"));

        if (!idea.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("권한이 없습니다");
        }

        return idea;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
    }

    private Idea findParentIdea(User user, UUID parentIdeaId) {
        if (parentIdeaId == null) return null;
        Idea parent = ideaRepository.findById(parentIdeaId)
                .orElseThrow(() -> new IllegalArgumentException("상위 아이디어를 찾을 수 없습니다"));
        if (!parent.getUser().getUserId().equals(user.getUserId())) {
            throw new IllegalArgumentException("권한이 없습니다");
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
}
