package com.dumpit.service;

import com.dumpit.entity.Idea;

import java.util.List;
import java.util.UUID;

public interface IdeaService {

    List<Idea> getIdeas(String email);

    Idea createIdea(String email, String title, String content, Boolean pinned);

    Idea updateIdea(String email, UUID ideaId, String title, String content, Boolean pinned);

    void deleteIdea(String email, UUID ideaId);
}
