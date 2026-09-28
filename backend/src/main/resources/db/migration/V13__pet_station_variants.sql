DO $$
BEGIN
  IF to_regclass('public.user_purchases') IS NOT NULL THEN
    ALTER TABLE user_purchases
      ADD COLUMN IF NOT EXISTS selected_variant VARCHAR(32);
  END IF;
END $$;
