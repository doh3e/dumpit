-- V12: 유저 AI 메모리 — AI 분석 프롬프트 <user_context> 주입용 자유 텍스트(500자)
-- 신규(빈) DB에서는 테이블이 아직 없으므로 V3~V11과 동일하게 존재 가드로 감싼다.
DO $$
BEGIN
  IF to_regclass('public.user_settings') IS NOT NULL THEN
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_memory VARCHAR(500);
  END IF;
END $$;
