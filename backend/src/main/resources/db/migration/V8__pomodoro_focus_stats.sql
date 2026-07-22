-- V8: 뽀모도로 누적 집중 통계 — 검증 통과 세션의 분·횟수 누적 (마이페이지 표시용)
-- 주의: 신규(빈) DB에서는 테이블이 아직 없으므로(Hibernate가 이후 생성) V3~V7과 동일하게 존재 가드로 감싼다.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_total_minutes int NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_total_sessions int NOT NULL DEFAULT 0;
  END IF;
END $$;
