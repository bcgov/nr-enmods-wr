-- V1.0.6__install_aws_s3_and_create_aqi_loader.sql
-- Installs RDS/Aurora extensions and creates the S3 → staging loader function.
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE).

-- 1) Extensions (RDS/Aurora)
-- CREATE EXTENSION IF NOT EXISTS aws_commons;
-- CREATE EXTENSION IF NOT EXISTS aws_s3;

-- 2) Loader function: streams CSV from S3 → AQI_CSV_IMPORT_STAGING
--    Pass secrets at CALL time from OpenShift; do NOT store in DB.
CREATE OR REPLACE FUNCTION run_aqi_s3_load(
    p_bucket        text,
    p_object_keys   text[],
    p_folder_name   text DEFAULT '',
    p_region        text DEFAULT 'us-east-2',
    p_iam_role_arn  text DEFAULT NULL,
    p_access_key    text DEFAULT NULL,
    p_secret_key    text DEFAULT NULL,
    p_session_token text DEFAULT NULL,
    p_process_name  text DEFAULT 'AQI_AWS_S3_SYNC'
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
    v_key   text;
    v_item_start_time timestamp;
    v_item_end_time   timestamp;
    v_rows_before bigint;
    v_rows_after  bigint;
    v_rows_added bigint;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'aws_s3')
    INTO v_has_aws_ext;

    PERFORM pg_advisory_lock(hashtext(p_process_name));

    RAISE NOTICE '[%] Starting process at %', p_process_name, now();
    INSERT INTO S3_SYNC_LOG(process_name, status, start_time, source_folder)
    VALUES (p_process_name, 'IN_PROGRESS', now(), p_folder_name)
    RETURNING id INTO v_log_id;

    TRUNCATE TABLE public.aqi_csv_import_staging;

    RAISE NOTICE '[%] S3 load for % keys: %', p_process_name, array_length(p_object_keys, 1), array_to_string(p_object_keys, ', ');

    FOREACH v_key IN ARRAY p_object_keys LOOP
        RAISE NOTICE '[%] Loading key: % at %', p_process_name, v_key, now();
        v_item_start_time := clock_timestamp();
        v_rows_before := (SELECT count(*) FROM public.aqi_csv_import_staging);

        IF v_has_aws_ext THEN
            v_s3_uri := aws_commons.create_s3_uri(p_bucket, v_key, p_region);

            RAISE NOTICE '[%] Using aws_s3 extension for key: %', p_process_name, v_key;
            IF p_iam_role_arn IS NOT NULL THEN
                RAISE NOTICE '[%] Importing with IAM role: %', p_process_name, p_iam_role_arn;
                PERFORM aws_s3.table_import_from_s3(
                    'public.aqi_csv_import_staging',
                    NULL, NULL,
                    v_s3_uri,
                    p_iam_role_arn
                );
            ELSE
                RAISE NOTICE '[%] Importing with access keys', p_process_name;
                PERFORM aws_s3.table_import_from_s3(
                    'public.aqi_csv_import_staging',
                    NULL, NULL,
                    v_s3_uri,
                    p_access_key, p_secret_key, p_session_token
                );
            END IF;

        ELSE
            v_copy_cmd := format(
                'AWS_ACCESS_KEY_ID=%L AWS_SECRET_ACCESS_KEY=%L %s aws s3 cp s3://%s/%s - | gunzip -c | tr -d ''\r'' | mlr --icsv --ocsv put ''for (k in $*) { if ($[k]=="") { $[k]=""; } }''',
                p_access_key,
                p_secret_key,
                CASE WHEN p_session_token IS NOT NULL THEN
                    format('AWS_SESSION_TOKEN=%L ', p_session_token)
                ELSE
                    ''
                END,
                p_bucket,
                v_key
            );
            RAISE NOTICE '[%] COPY FROM PROGRAM command: %', p_process_name, v_copy_cmd;

            v_item_start_time := clock_timestamp();
            BEGIN
                EXECUTE format(
                    'COPY public.aqi_csv_import_staging FROM PROGRAM %L WITH CSV HEADER',
                    v_copy_cmd
                );
                RAISE NOTICE '[%] COPY succeeded for key: % at %', p_process_name, v_key, now();
            EXCEPTION WHEN OTHERS THEN
                v_item_end_time := clock_timestamp();
                RAISE NOTICE '[%] COPY failed for key: % at %, error: %', p_process_name, v_key, v_item_end_time, SQLERRM;
                RAISE NOTICE '[%] COPY duration for failed key: %: % seconds', p_process_name, v_key, EXTRACT(EPOCH FROM v_item_end_time - v_item_start_time);
                RAISE;
            END;
        END IF;

        v_item_end_time := clock_timestamp();
        v_rows_after := (SELECT count(*) FROM public.aqi_csv_import_staging);
        v_rows_added := v_rows_after - v_rows_before;
        RAISE NOTICE '[%] Finished key: % at %, records added: %, duration: % seconds',
            p_process_name, v_key, v_item_end_time, v_rows_added, EXTRACT(EPOCH FROM v_item_end_time - v_item_start_time);
    END LOOP;

    SELECT count(*) INTO v_rows FROM public.aqi_csv_import_staging;

    UPDATE S3_SYNC_LOG
       SET finish_time = now(),
           status      = 'SUCCESS',
           rows_loaded = v_rows
     WHERE id = v_log_id;

    PERFORM pg_advisory_unlock(hashtext(p_process_name));
    RAISE NOTICE '[%] Process completed successfully at %, total rows: %', p_process_name, now(), v_rows;
    RETURN v_rows;

EXCEPTION WHEN OTHERS THEN
    UPDATE S3_SYNC_LOG
       SET finish_time   = now(),
           status        = 'FAILED',
           error_message = substr(SQLSTATE || ': ' || SQLERRM, 1, 2000)
     WHERE id = v_log_id;

    PERFORM pg_advisory_unlock(hashtext(p_process_name));
    RAISE NOTICE '[%] Process failed at %: %', p_process_name, now(), SQLERRM;
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