package com.dumpit.repository;

import com.dumpit.entity.Routine;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoutineRepository extends JpaRepository<Routine, UUID> {

    List<Routine> findByUserAndDeletedAtIsNullOrderByEnabledDescCreatedAtDesc(User user);

    long countByUserAndDeletedAtIsNull(User user);

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    @Query("""
        SELECT r FROM Routine r
        WHERE r.routineId = :routineId
          AND r.deletedAt IS NULL
    """)
    Optional<Routine> findActiveById(@Param("routineId") UUID routineId);

    @Query("""
        SELECT r FROM Routine r
        WHERE r.enabled = true
          AND r.deletedAt IS NULL
          AND r.startDate <= :date
          AND (r.endDate IS NULL OR r.endDate >= :date)
          AND (r.lastGeneratedDate IS NULL OR r.lastGeneratedDate < :date)
    """)
    List<Routine> findGenerationCandidates(@Param("date") LocalDate date);

    @Modifying
    @Query("""
        UPDATE Routine r
        SET r.deletedAt = :deletedAt,
            r.enabled = false
        WHERE r.user = :user
          AND r.deletedAt IS NULL
    """)
    int softDeleteByUser(@Param("user") User user, @Param("deletedAt") LocalDateTime deletedAt);
}
