-- V7: 유저 설정(user_settings) — 일과 시간 + 알림 설정 서버 저장
-- 설계: docs/superpowers/specs/2026-07-22-user-settings-active-hours-design.md
-- 주의: 신규(빈) DB에서는 users가 아직 없으므로(Hibernate가 이후 생성) V6과 동일하게 존재 가드로 감싼다.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS user_settings (
        user_id                 uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        routine_start_hour      integer     NOT NULL DEFAULT 9  CHECK (routine_start_hour BETWEEN 0 AND 23),
        routine_end_hour        integer     NOT NULL DEFAULT 22 CHECK (routine_end_hour BETWEEN 0 AND 23),
        notifications_enabled   boolean     NOT NULL DEFAULT true,
        notification_thresholds varchar(64) NOT NULL DEFAULT '[60]',
        created_at              timestamp   NOT NULL DEFAULT now(),
        updated_at              timestamp   NOT NULL DEFAULT now(),
        CHECK (routine_start_hour <> routine_end_hour)
    );
  END IF;
END $$;
