package com.dumpit.repository;

import com.dumpit.entity.Inquiry;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface InquiryRepository extends JpaRepository<Inquiry, UUID> {
    List<Inquiry> findAllByOrderByCreatedAtDesc();

    List<Inquiry> findByUserOrderByCreatedAtDesc(User user);

    List<Inquiry> findByUser(User user);

    // 계정을 완전 삭제할 때 문의 본문은 남긴다(처리 기록 보관 1년) — 사용자 연결만 끊는다.
    // user_id가 nullable이라 스키마 변경 없이 가능하다.
    @Modifying
    @Query("""
        UPDATE Inquiry i
        SET i.user = NULL,
            i.userEmail = :anonymizedEmail
        WHERE i.user = :user
    """)
    int unlinkUser(@Param("user") User user, @Param("anonymizedEmail") String anonymizedEmail);

    // 처리 완료 후 1년. 답변이 끝내 없던 문의는 접수일 기준으로 정리한다.
    @Modifying
    @Query("""
        DELETE FROM Inquiry i
        WHERE (i.repliedAt IS NOT NULL AND i.repliedAt < :cutoff)
           OR (i.repliedAt IS NULL AND i.createdAt < :cutoff)
    """)
    int deleteProcessedBefore(@Param("cutoff") LocalDateTime cutoff);
}
