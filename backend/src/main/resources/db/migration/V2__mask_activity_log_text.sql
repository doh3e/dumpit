-- activity_logs 스냅샷 JSON에서 원문 텍스트(title/description/content/name) 제거.
-- 민감정보(건강/법률/재무 등)가 평문으로 남는 것을 차단한다. 비가역 작업 — 실행 전 백업 필수.
-- 빈 DB에서는 activity_logs가 아직 없을 수 있으므로 가드한다.
DO $$
BEGIN
    IF to_regclass('public.activity_logs') IS NOT NULL THEN
        UPDATE activity_logs
        SET before_json = (before_json::jsonb - 'title' - 'description' - 'content' - 'name')::text
        WHERE before_json IS NOT NULL
          AND before_json::jsonb ?| array['title', 'description', 'content', 'name'];

        UPDATE activity_logs
        SET after_json = (after_json::jsonb - 'title' - 'description' - 'content' - 'name')::text
        WHERE after_json IS NOT NULL
          AND after_json::jsonb ?| array['title', 'description', 'content', 'name'];
    END IF;
END $$;
