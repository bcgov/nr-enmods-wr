CREATE TABLE S3_SYNC_LOG (
    id                 BIGSERIAL PRIMARY KEY,
    process_name       TEXT NOT NULL DEFAULT 'AQI_AWS_S3_SYNC',
    start_time         TIMESTAMPTZ NOT NULL DEFAULT now(),
    finish_time        TIMESTAMPTZ,
    status             TEXT NOT NULL CHECK (status IN ('IN_PROGRESS','SUCCESS','FAILED')),
    rows_loaded        BIGINT DEFAULT 0,
    error_message      TEXT,
    staging_table_name TEXT NOT NULL DEFAULT 'AQI_CSV_IMPORT_STAGING',
    operational_table_name TEXT NOT NULL DEFAULT 'AQI_CSV_IMPORT_OPERATIONAL'
);

CREATE INDEX IF NOT EXISTS idx_s3_sync_log_time ON S3_SYNC_LOG (start_time DESC);