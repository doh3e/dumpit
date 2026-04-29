package com.dumpit.repository;

import com.dumpit.entity.Idea;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface IdeaRepository extends JpaRepository<Idea, UUID> {

    List<Idea> findByUserOrderByPinnedDescUpdatedAtDesc(User user);

    boolean existsByParentIdea(Idea parentIdea);

    long countByUser(User user);
}
