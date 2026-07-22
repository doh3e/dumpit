package com.dumpit.repository;

import com.dumpit.entity.UserSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserSettingsRepository extends JpaRepository<UserSettings, UUID> {

    // planning 경로에서 유저 조회 없이 단일 쿼리로 설정을 가져온다 (대시보드 쿼리 수 상한 준수)
    @Query("select s from UserSettings s where s.user.email = :email")
    Optional<UserSettings> findByUserEmail(@Param("email") String email);
}
