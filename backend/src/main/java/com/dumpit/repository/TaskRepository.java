package com.dumpit.repository;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    @Query("""
        SELECT t FROM Task t
        WHERE t.user = :user AND t.status <> 'CANCELLED'
        ORDER BY
            CASE WHEN t.userPriorityScore IS NOT NULL THEN t.userPriorityScore
                ELSE t.aiPriorityScore END DESC NULLS LAST,
            t.deadline ASC NULLS LAST
    """)
    List<Task> findByUserOrderByPriority(@Param("user") User user);

    List<Task> findByUserAndStatusOrderByCreatedAtDesc(User user, Task.Status status);
}
