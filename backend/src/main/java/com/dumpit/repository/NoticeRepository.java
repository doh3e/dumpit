package com.dumpit.repository;

import com.dumpit.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
          AND n.pinned = true
        ORDER BY n.publishAt DESC, n.createdAt DESC
    """)
    List<Notice> findPinnedPublished(@Param("now") LocalDateTime now);

    @Query("""
        SELECT n FROM Notice n
        WHERE n.status = 'PUBLISHED'
          AND n.publishAt <= :now
          AND n.pinned = false
        ORDER BY n.publishAt DESC, n.createdAt DESC
    """)
    Page<Notice> findRegularPublished(@Param("now") LocalDateTime now, Pageable pageable);
}
