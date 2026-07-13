-- V5: 공지 고정/팝업 플래그
-- 주의: 신규(빈) DB에서는 테이블이 아직 없으므로(Hibernate가 이후 생성) V3/V4와 동일하게 존재 가드로 감싼다.
DO $$
BEGIN
  IF to_regclass('public.notices') IS NOT NULL THEN
    ALTER TABLE notices ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
    ALTER TABLE notices ADD COLUMN IF NOT EXISTS popup boolean NOT NULL DEFAULT false;
  END IF;
END $$;
