package com.dumpit.repository;

import com.dumpit.entity.Idea;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IdeaRepository extends JpaRepository<Idea, UUID> {

    List<Idea> findByUserAndDeletedAtIsNullOrderByPinnedDescUpdatedAtDesc(User user);

    boolean existsByParentIdeaAndDeletedAtIsNull(Idea parentIdea);

    long countByUserAndDeletedAtIsNull(User user);

    @Query("""
        SELECT i FROM Idea i
        WHERE i.ideaId = :ideaId
          AND i.deletedAt IS NULL
    """)
    Optional<Idea> findActiveById(@Param("ideaId") UUID ideaId);
}
