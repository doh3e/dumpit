package com.dumpit.repository;

import com.dumpit.entity.Notice;
import com.dumpit.entity.NoticeRead;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface NoticeReadRepository extends JpaRepository<NoticeRead, UUID> {

    boolean existsByNoticeAndUser(Notice notice, User user);

    @Query("""
        SELECT n FROM Notice n
        WHERE n.status = 'PUBLISHED'
          AND n.publishAt <= :now
          AND NOT EXISTS (
              SELECT r FROM NoticeRead r
              WHERE r.notice = n
                AND r.user = :user
          )
        ORDER BY n.publishAt DESC, n.createdAt DESC
    """)
    List<Notice> findUnreadPublished(@Param("user") User user, @Param("now") LocalDateTime now);
}
