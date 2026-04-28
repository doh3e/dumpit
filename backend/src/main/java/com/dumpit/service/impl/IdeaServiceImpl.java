package com.dumpit.service.impl;

import com.dumpit.entity.Idea;
import com.dumpit.entity.User;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.IdeaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IdeaServiceImpl implements IdeaService {

    private final IdeaRepository ideaRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Idea> getIdeas(String email) {
        return ideaRepository.findByUserOrderByPinnedDescUpdatedAtDesc(findUser(email));
    }

    @Override
    @Transactional
    public Idea createIdea(String email, String title, String content, Boolean pinned) {
        Idea idea = Idea.of(findUser(email), title.trim(), trimToNull(content));
        idea.update(null, null, pinned);
        return ideaRepository.save(idea);
    }

    @Override
    @Transactional
    public Idea updateIdea(String email, UUID ideaId, String title, String content, Boolean pinned) {
        Idea idea = findOwnedIdea(email, ideaId);
        idea.update(trimToNull(title), content, pinned);
        return ideaRepository.save(idea);
    }

    @Override
    @Transactional
    public void deleteIdea(String email, UUID ideaId) {
        Idea idea = findOwnedIdea(email, ideaId);
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

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
