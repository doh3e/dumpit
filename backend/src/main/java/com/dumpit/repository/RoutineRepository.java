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

    // Admin 유저 목록에서 유저당 1쿼리씩 도는 N+1을 피하기 위한 집계 쿼리 — AdminUserController 참고
    @Query("""
        SELECT r.user.userId, COUNT(r) FROM Routine r
        WHERE r.deletedAt IS NULL
        GROUP BY r.user.userId
    """)
    List<Object[]> countActiveGroupedByUser();

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

    // enabled는 건드리지 않는다 — 생성 쿼리(findDueRoutines·findEnabledRoutinesMissingNextRunAt)가
    // deletedAt IS NULL도 함께 보므로 억제에는 이미 충분하고, 여기서 false로 덮으면
    // 사용자가 원래 꺼둔 루틴인지 탈퇴가 끈 루틴인지 구분할 수 없어 복구가 부정확해진다.
    @Modifying
    @Query("""
        UPDATE Routine r
        SET r.deletedAt = :deletedAt
        WHERE r.user = :user
          AND r.deletedAt IS NULL
    """)
    int softDeleteByUser(@Param("user") User user, @Param("deletedAt") LocalDateTime deletedAt);

    // 탈퇴가 찍은 시각과 정확히 일치하는 행만 되살린다 — 사용자가 직접 지운 루틴은 부활하지 않는다.
    @Modifying
    @Query("""
        UPDATE Routine r
        SET r.deletedAt = NULL
        WHERE r.user = :user
          AND r.deletedAt = :deletedAt
    """)
    int restoreByUser(@Param("user") User user, @Param("deletedAt") LocalDateTime deletedAt);

    @Modifying
    @Query("DELETE FROM Routine r WHERE r.user = :user")
    int hardDeleteByUser(@Param("user") User user);
}
