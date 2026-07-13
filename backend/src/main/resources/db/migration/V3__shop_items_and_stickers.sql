-- V3: 상점 개편 — user_purchases.item_id → item_code, user_equipments 신설, 스티커 칼럼
-- 주의: 신규(빈) DB에서는 테이블이 아직 없으므로 모든 구문을 존재 가드로 감싼다.

DO $$
BEGIN
  -- 1) user_purchases: int item_id → varchar item_code (구 카탈로그 폐기, 실구매 0건 전제)
  IF to_regclass('public.user_purchases') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='user_purchases' AND column_name='item_id') THEN
    DELETE FROM user_purchases;
    ALTER TABLE user_purchases DROP COLUMN item_id;
    ALTER TABLE user_purchases ADD COLUMN item_code varchar(64) NOT NULL DEFAULT '';
    ALTER TABLE user_purchases ALTER COLUMN item_code DROP DEFAULT;
  END IF;

  IF to_regclass('public.user_purchases') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_user_purchases_user_item') THEN
    ALTER TABLE user_purchases ADD CONSTRAINT uk_user_purchases_user_item UNIQUE (user_id, item_code);
  END IF;

  -- 2) user_equipments (users가 있을 때만 — 신규 DB는 Hibernate가 생성)
  IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.user_equipments') IS NULL THEN
    CREATE TABLE user_equipments (
      equipment_id uuid PRIMARY KEY,
      user_id      uuid NOT NULL REFERENCES users(user_id),
      slot         varchar(20) NOT NULL,
      item_code    varchar(64) NOT NULL,
      updated_at   timestamp,
      CONSTRAINT uk_user_equipments_user_slot UNIQUE (user_id, slot)
    );
  END IF;

  -- 3) 스티커 칼럼 (nullable)
  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sticker_code varchar(64);
  END IF;
  IF to_regclass('public.ideas') IS NOT NULL THEN
    ALTER TABLE ideas ADD COLUMN IF NOT EXISTS sticker_code varchar(64);
  END IF;
END $$;
