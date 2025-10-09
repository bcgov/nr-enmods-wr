-- V1.0.6__install_aws_s3_and_create_aqi_loader.sql
-- Installs RDS/Aurora extensions and creates the S3 → staging loader function.
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE).

-- 1) Extensions (RDS/Aurora)
-- CREATE EXTENSION IF NOT EXISTS aws_commons;
-- CREATE EXTENSION IF NOT EXISTS aws_s3;

-- 2) Loader function: streams CSV from S3 → AQI_CSV_IMPORT_STAGING
--    Pass secrets at CALL time from OpenShift; do NOT store in DB.
CREATE OR REPLACE FUNCTION run_aqi_s3_load(
    p_bucket        text,                                -- 'my-bucket'
    p_object_key    text,                                -- 'aqi/current.csv'
    p_region        text DEFAULT 'us-east-2',            -- regional S3 endpoint
    p_iam_role_arn  text DEFAULT NULL,                   -- RDS IAM role
    p_access_key    text DEFAULT NULL,                   -- runtime only (from secrets)
    p_secret_key    text DEFAULT NULL,                   -- runtime only
    p_session_token text DEFAULT NULL,                   -- runtime only (STS)
    p_process_name  text DEFAULT 'AQI_AWS_S3_SYNC'       -- advisory lock & logging
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id bigint;
    v_rows   bigint := 0;
    v_has_aws_ext boolean := false;
    v_s3_uri text;
    v_copy_cmd text;
BEGIN
    -- Detect if aws_s3 extension exists (RDS/Aurora)
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'aws_s3')
    INTO v_has_aws_ext;

    -- Prevent overlapping runs
    PERFORM pg_advisory_lock(hashtext(p_process_name));

    -- Log start
    INSERT INTO S3_SYNC_LOG(process_name, status, start_time)
    VALUES (p_process_name, 'IN_PROGRESS', now())
    RETURNING id INTO v_log_id;

    -- Start clean
    TRUNCATE TABLE public.aqi_csv_import_staging;

    IF v_has_aws_ext THEN
        -- RDS/Aurora path
        v_s3_uri := aws_commons.create_s3_uri(p_bucket, p_object_key, p_region);

        IF p_iam_role_arn IS NOT NULL THEN
            PERFORM aws_s3.table_import_from_s3(
                'public.aqi_csv_import_staging',
                NULL, NULL,
                v_s3_uri,
                p_iam_role_arn
            );
        ELSE
            PERFORM aws_s3.table_import_from_s3(
                'public.aqi_csv_import_staging',
                NULL, NULL,
                v_s3_uri,
                p_access_key, p_secret_key, p_session_token
            );
        END IF;

    ELSE
        -- Build AWS CLI command with credentials and S3 path
        v_copy_cmd := format(
            'AWS_ACCESS_KEY_ID=%L AWS_SECRET_ACCESS_KEY=%L %s aws s3 cp s3://%s/%s - | tr -d ''\r'' | mlr --icsv --ocsv put ''for (k in $*) { if ($[k]=="") { $[k]=""; } }''',
            p_access_key,
            p_secret_key,
            CASE WHEN p_session_token IS NOT NULL THEN
                format('AWS_SESSION_TOKEN=%L ', p_session_token)
            ELSE
                ''
            END,
            p_bucket,
            p_object_key
        );

        -- Execute COPY FROM PROGRAM with the dynamic command
        EXECUTE format(
            'COPY public.aqi_csv_import_staging FROM PROGRAM %L WITH CSV HEADER',
            v_copy_cmd
        );
    END IF;

    -- Count rows loaded
    SELECT count(*) INTO v_rows FROM public.aqi_csv_import_staging;

    -- Mark success
    UPDATE S3_SYNC_LOG
       SET finish_time = now(),
           status      = 'SUCCESS',
           rows_loaded = v_rows
     WHERE id = v_log_id;

    PERFORM pg_advisory_unlock(hashtext(p_process_name));
    RETURN v_rows;

EXCEPTION WHEN OTHERS THEN
    -- Failure path
    UPDATE S3_SYNC_LOG
       SET finish_time   = now(),
           status        = 'FAILED',
           error_message = substr(SQLSTATE || ': ' || SQLERRM, 1, 2000)
     WHERE id = v_log_id;

    PERFORM pg_advisory_unlock(hashtext(p_process_name));
    RAISE;
END;
$$;

-- Usage (from OpenShift job; params injected at runtime):
-- SELECT run_aqi_s3_load_rds(
--   'your-bucket',
--   'aqi/current.csv',
--   'ca-central-1',
--   NULL,
--   :'AWS_ACCESS_KEY_ID', :'AWS_SECRET_ACCESS_KEY', :'AWS_SESSION_TOKEN'
-- );