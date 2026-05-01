package com.dumpit.repository;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    @Query("""
        SELECT t FROM Task t
        WHERE t.user = :user
          AND t.deletedAt IS NULL
          AND t.status <> 'CANCELLED'
        ORDER BY
            CASE WHEN t.userPriorityScore IS NOT NULL THEN t.userPriorityScore
                ELSE t.aiPriorityScore END DESC NULLS LAST,
            t.deadline ASC NULLS LAST
    """)
    List<Task> findByUserOrderByPriority(@Param("user") User user);

    List<Task> findByUserAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(User user, Task.Status status);

    boolean existsByRoutineRoutineIdAndRoutineScheduledDateAndDeletedAtIsNull(UUID routineId, LocalDate routineScheduledDate);

    @Query("""
        SELECT t FROM Task t
        WHERE t.taskId = :taskId
          AND t.deletedAt IS NULL
    """)
    Optional<Task> findActiveById(@Param("taskId") UUID taskId);

    @Modifying
    @Query("""
        UPDATE Task t
        SET t.routine = null
        WHERE t.routine.routineId = :routineId
          AND t.deletedAt IS NULL
    """)
    void clearRoutineReference(@Param("routineId") UUID routineId);

    @Query("""
        SELECT t FROM Task t
        WHERE t.user = :user
          AND t.deletedAt IS NULL
          AND t.status NOT IN ('DONE', 'CANCELLED')
          AND t.deadline IS NOT NULL
        ORDER BY t.deadline ASC
    """)
    List<Task> findDeadlineIndexCandidates(@Param("user") User user);

    @Query("""
        SELECT t FROM Task t
        WHERE t.user = :user
          AND t.deletedAt IS NULL
          AND t.status NOT IN ('DONE', 'CANCELLED')
          AND t.deadline IS NOT NULL
          AND t.deadline <= :cutoff
        ORDER BY t.deadline ASC
    """)
    List<Task> findDeadlineNudges(@Param("user") User user, @Param("cutoff") LocalDateTime cutoff);

    long countByUserAndStatusAndDeletedAtIsNull(User user, Task.Status status);

    long countByUserAndDeletedAtIsNull(User user);

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    @Query("""
        SELECT t FROM Task t
        WHERE t.user = :user
          AND t.deletedAt IS NULL
          AND t.status NOT IN ('DONE', 'CANCELLED')
          AND t.deadline IS NOT NULL
          AND t.deadline < :now
        ORDER BY t.deadline ASC
    """)
    List<Task> findOverdueTasks(@Param("user") User user, @Param("now") LocalDateTime now);

    @Query("""
        SELECT t.category, COUNT(t) FROM Task t
        WHERE t.user = :user
          AND t.deletedAt IS NULL
          AND t.status = 'DONE'
        GROUP BY t.category
    """)
    List<Object[]> countDoneByCategory(@Param("user") User user);

    @Query("""
        SELECT t.completedAt FROM Task t
        WHERE t.user = :user
          AND t.deletedAt IS NULL
          AND t.status = 'DONE'
          AND t.completedAt >= :since
        ORDER BY t.completedAt DESC
    """)
    List<LocalDateTime> findCompletedAtSince(@Param("user") User user, @Param("since") LocalDateTime since);

    @Modifying
    @Query("""
        UPDATE Task t
        SET t.deletedAt = :deletedAt
        WHERE t.user = :user
          AND t.deletedAt IS NULL
    """)
    int softDeleteByUser(@Param("user") User user, @Param("deletedAt") LocalDateTime deletedAt);
}
