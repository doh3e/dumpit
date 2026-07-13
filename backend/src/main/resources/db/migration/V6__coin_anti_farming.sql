-- V6: 코인 어뷰징 방어 — 완료 지급액 저장(정확 회수용) + 뽀모도로 세션 시작 기록
-- 설계: docs/superpowers/specs/2026-07-14-coin-anti-farming-design.md
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS coins_granted int NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_started_at timestamp;
