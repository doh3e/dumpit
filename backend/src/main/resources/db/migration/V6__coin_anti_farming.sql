-- V6: 코인 어뷰징 방어 — 완료 지급액 저장(정확 회수용) + 뽀모도로 세션 시작 기록
-- 설계: docs/superpowers/specs/2026-07-14-coin-anti-farming-design.md
-- 주의: 신규(빈) DB에서는 테이블이 아직 없으므로(Hibernate가 이후 생성) V3/V4와 동일하게 존재 가드로 감싼다.
DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS coins_granted int NOT NULL DEFAULT 0;
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_started_at timestamp;
  END IF;
END $$;
