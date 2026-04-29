package com.dumpit.service;

import com.dumpit.entity.Idea;
import com.dumpit.entity.Task;

import java.util.List;
import java.util.UUID;

public interface IdeaService {

    List<Idea> getIdeas(String email);

    Idea createIdea(String email, String title, String content, Boolean pinned,
                    Task.Category category, UUID parentIdeaId);

    List<Idea> createIdeasFromLines(String email, String rawText, Task.Category category, UUID parentIdeaId);

    Idea updateIdea(String email, UUID ideaId, String title, String content, Boolean pinned,
                    Task.Category category, UUID parentIdeaId);

    Task convertToTask(String email, UUID ideaId);

    void deleteIdea(String email, UUID ideaId);
}
