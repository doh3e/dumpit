-- Baseline: 기존 스키마는 Hibernate(ddl-auto)가 생성했다.
-- 데이터가 이미 있는 DB는 baseline-on-migrate로 V1에 베이스라인이 찍히고 이 파일은 실행되지 않는다.
-- 빈 로컬 DB에서는 이 파일이 no-op으로 실행되고, 엔티티 테이블은 이후 Hibernate(ddl-auto: update)가 만든다.
-- 이 시점 이후 모든 스키마 변경은 V2+ 마이그레이션으로 관리한다.
SELECT 1;
