-- V9: 뽀모도로 세션 계획 — settle 일괄 정산용 (계획 5필드 + 정산된 세트 수)
-- 주의: 신규(빈) DB에서는 테이블이 아직 없으므로(Hibernate가 이후 생성) V3~V8과 동일하게 존재 가드로 감싼다.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_plan_focus_minutes int;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_plan_break_minutes int;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_plan_long_break_minutes int;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_plan_long_break_every int;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_plan_sets_target int;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_settled_sessions int NOT NULL DEFAULT 0;
  END IF;
END $$;
