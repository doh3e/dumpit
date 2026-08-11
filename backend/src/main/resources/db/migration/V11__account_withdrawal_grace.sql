-- V11: 탈퇴 2단계화 — 유예 기간(복구 가능) 후 완전 삭제
-- 신규(빈) DB에서는 테이블이 아직 없으므로 V3~V10과 동일하게 존재 가드로 감싼다.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    -- 완전 삭제 예정 시각. withdrawn_at + N일로 계산하지 않고 값으로 들고 있는다 —
    -- 법적 보존 요청 등으로 개별 연장이 필요할 때 이 값만 미루면 된다.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS purge_after TIMESTAMP;

    -- 탈퇴가 콘텐츠에 찍은 소프트 삭제 타임스탬프.
    -- 복구할 때 "탈퇴가 지운 행"과 "사용자가 탈퇴 전에 직접 지운 행"을 가르는 유일한 근거다.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_marked_at TIMESTAMP;

    -- purge 스케줄러가 매일 전체 스캔하지 않도록 — 대상은 항상 WITHDRAWN뿐
    CREATE INDEX IF NOT EXISTS idx_users_purge_after
      ON users(purge_after) WHERE status = 'WITHDRAWN';

    -- 로그인 조회 키(provider, provider_id)에 인덱스가 없어 매 로그인이 순차 스캔이었다.
    -- 유예 기간에는 provider_id를 원본 그대로 두므로 중복이 생기면 findByProviderAndProviderId가
    -- NonUniqueResultException으로 로그인 전체를 무너뜨린다 — 유니크로 막는다.
    CREATE UNIQUE INDEX IF NOT EXISTS uk_users_provider_provider_id
      ON users(provider, provider_id);
  END IF;
END $$;
