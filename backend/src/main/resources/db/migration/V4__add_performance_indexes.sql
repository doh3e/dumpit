-- V4: 성능 인덱스 — Task 12 쿼리 진단(EXPLAIN) 결과, 주요 도메인 테이블이 PK 외 인덱스가 없어
-- per-user 리스트 조회(GET /tasks·/ideas·/routines·/dashboard/planning, brain_dumps 확정 등)가 전부 Seq Scan.
-- 네 테이블 모두 조회 술어가 `WHERE user_id = ? AND deleted_at IS NULL [...]`로 동일하므로
-- (user_id, deleted_at) 복합 인덱스로 공통 접두 술어를 인덱스 스캔으로 좁힌다.
-- 주의: 신규(빈) DB에서는 테이블이 아직 없으므로(Hibernate가 이후 생성) V3와 동일하게 존재 가드로 감싼다.
-- 테이블 규모가 작아 잠금 시간은 무시 가능 → 일반 CREATE INDEX 사용(CONCURRENTLY 불필요).

DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id_deleted_at ON tasks (user_id, deleted_at);
  END IF;

  IF to_regclass('public.ideas') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_ideas_user_id_deleted_at ON ideas (user_id, deleted_at);
  END IF;

  IF to_regclass('public.routines') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_routines_user_id_deleted_at ON routines (user_id, deleted_at);
  END IF;

  IF to_regclass('public.brain_dumps') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_brain_dumps_user_id_deleted_at ON brain_dumps (user_id, deleted_at);
  END IF;
END $$;
