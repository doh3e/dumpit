package com.dumpit.repository;

import com.dumpit.entity.Routine;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
          AND r.nextRunAt IS NOT NULL
          AND r.nextRunAt <= :now
    """)
    List<Routine> findDueRoutines(@Param("now") LocalDateTime now);

    @Query("""
        SELECT r FROM Routine r
        WHERE r.enabled = true
          AND r.deletedAt IS NULL
          AND r.nextRunAt IS NULL
    """)
    List<Routine> findEnabledRoutinesMissingNextRunAt();

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
