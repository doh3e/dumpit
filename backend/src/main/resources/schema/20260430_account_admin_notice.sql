-- Manual production schema changes for account status, admin notices, and notice reads.
-- Apply before deploying the matching backend when spring.jpa.hibernate.ddl-auto=validate.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP;

ALTER TABLE brain_dumps
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS notices (
    notice_id UUID PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES users(user_id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    publish_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notices_status_publish_at
    ON notices(status, publish_at DESC);

CREATE TABLE IF NOT EXISTS notice_reads (
    notice_read_id UUID PRIMARY KEY,
    notice_id UUID NOT NULL REFERENCES notices(notice_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    read_at TIMESTAMP,
    CONSTRAINT uk_notice_reads_notice_user UNIQUE (notice_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notice_reads_user_id
    ON notice_reads(user_id);
