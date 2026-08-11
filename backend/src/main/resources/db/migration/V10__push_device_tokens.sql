-- V10: Phase 4 푸시 — FCM 기기 토큰 테이블 + 아침 브리핑 토글
-- 신규(빈) DB에서는 테이블이 아직 없으므로 V3~V9와 동일하게 존재 가드로 감싼다.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS device_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL DEFAULT 'android',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
  END IF;
  IF to_regclass('public.user_settings') IS NOT NULL THEN
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS briefing_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;
