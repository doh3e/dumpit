CREATE TABLE IF NOT EXISTS routines (
    routine_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    repeat_type VARCHAR(255) NOT NULL,
    days_of_week VARCHAR(40),
    days_of_month VARCHAR(100),
    create_time TIME NOT NULL DEFAULT '06:00:00',
    start_date DATE NOT NULL,
    end_date DATE,
    last_generated_date DATE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS routine_id UUID;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS routine_scheduled_date DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_routines_user'
    ) THEN
        ALTER TABLE routines
            ADD CONSTRAINT fk_routines_user
            FOREIGN KEY (user_id)
            REFERENCES users(user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tasks_routine'
    ) THEN
        ALTER TABLE tasks
            ADD CONSTRAINT fk_tasks_routine
            FOREIGN KEY (routine_id)
            REFERENCES routines(routine_id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uk_tasks_routine_scheduled_date'
    ) THEN
        ALTER TABLE tasks
            ADD CONSTRAINT uk_tasks_routine_scheduled_date
            UNIQUE (routine_id, routine_scheduled_date);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_routines_user_enabled
    ON routines(user_id, enabled);

CREATE INDEX IF NOT EXISTS idx_routines_enabled_create_time
    ON routines(enabled, create_time);

CREATE INDEX IF NOT EXISTS idx_tasks_routine_scheduled_date
    ON tasks(routine_id, routine_scheduled_date);
