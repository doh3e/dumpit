package com.dumpit.repository;

import com.dumpit.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface NoticeRepository extends JpaRepository<Notice, UUID> {

    List<Notice> findAllByOrderByPublishAtDescCreatedAtDesc();

    @Query("""
        SELECT n FROM Notice n
        WHERE n.status = 'PUBLISHED'
          AND n.publishAt <= :now
        ORDER BY n.publishAt DESC, n.createdAt DESC
    """)
    List<Notice> findPublished(@Param("now") LocalDateTime now);
}
