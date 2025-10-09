-- V21__create_aqi_swap_with_prebuilt_indexes.sql
-- Swap pattern with indexes rebuilt on STAGING before promotion.
-- Result: WR queries see a fully indexed OPERATIONAL immediately after swap.

CREATE OR REPLACE FUNCTION run_aqi_table_swap(
    p_process_name TEXT DEFAULT 'public.AQI_AWS_S3_SYNC'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id     BIGINT;
    v_rows_stg   BIGINT;
    v_schema     CONSTANT TEXT := 'public';
    v_oper       CONSTANT TEXT := 'aqi_csv_import_operational';
    v_stg        CONSTANT TEXT := 'aqi_csv_import_staging';
    v_tmp        TEXT          := 'aqi_csv_import_tmp';
BEGIN
    -- If our S3 load already logged IN_PROGRESS, reuse it; else start a new one
    SELECT id INTO v_log_id
      FROM S3_SYNC_LOG
     WHERE process_name = p_process_name
       AND status = 'IN_PROGRESS'
     ORDER BY start_time DESC
     LIMIT 1;

    IF v_log_id IS NULL THEN
        INSERT INTO S3_SYNC_LOG(process_name, status, start_time)
        VALUES (p_process_name, 'IN_PROGRESS', now())
        RETURNING id INTO v_log_id;
    END IF;

    -- Count rows in staging (for logging)
    EXECUTE format('SELECT count(*) FROM %I.%I', v_schema, v_stg) INTO v_rows_stg;

    /**********************************************************************
     * 1) (Re)build indexes ON STAGING (non-concurrent is fine: no readers)
     *    These indexes will follow the table when it is renamed to OPERATIONAL.
     **********************************************************************/
    -- Clean up any previous staging indexes (idempotent)
    DO $drop_stg_idx$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location') THEN
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analysis_method') THEN
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analysis_method';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_sample') THEN
            EXECUTE 'DROP INDEX public.idx_aqi_stg_sample';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_dates') THEN
            EXECUTE 'DROP INDEX public.idx_aqi_stg_dates';
        END IF;
    END
    $drop_stg_idx$;

    -- Build fresh staging indexes (tune the set as your WR filters evolve)
    EXECUTE format('CREATE INDEX idx_aqi_stg_location         ON %I.%I (Location_ID)',             v_schema, v_stg);
    EXECUTE format('CREATE INDEX idx_aqi_stg_analysis_method  ON %I.%I (Analysis_Method)',         v_schema, v_stg);
    EXECUTE format('CREATE INDEX idx_aqi_stg_sample           ON %I.%I (Lab_Sample_ID)',           v_schema, v_stg);
    EXECUTE format('CREATE INDEX idx_aqi_stg_dates            ON %I.%I (Lab_Prepared_Date_Time)',   v_schema, v_stg);

    -- Optional stats to help planner as soon as the swap completes
    EXECUTE format('ANALYZE %I.%I', v_schema, v_stg);

    /**********************************************************************
     * 2) Atomic swap (all within this transaction)
     **********************************************************************/
    -- Ensure temp holder doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_tmp) THEN
        EXECUTE format('DROP TABLE %I.%I', v_schema, v_tmp);
    END IF;

    -- operational → tmp
    EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', v_schema, v_oper, v_tmp);
    -- staging → operational  (indexes & stats come along)
    EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', v_schema, v_stg,  v_oper);
    -- tmp → staging
    EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', v_schema, v_tmp,  v_stg);

    /**********************************************************************
     * 3) Refresh lookup materialized views (if present)
     **********************************************************************/
    PERFORM 1 FROM pg_proc WHERE proname = 'refresh_aqi_lookup_materialized_views';
    IF FOUND THEN
        PERFORM refresh_aqi_lookup_materialized_views();
    END IF;

    /**********************************************************************
     * 4) New STAGING cleanup: drop its (now old) indexes and truncate
     **********************************************************************/
    DO $drop_new_stg_idx$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location') THEN
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analysis_method') THEN
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analysis_method';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_sample') THEN
            EXECUTE 'DROP INDEX public.idx_aqi_stg_sample';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_dates') THEN
            EXECUTE 'DROP INDEX public.idx_aqi_stg_dates';
        END IF;
    END
    $drop_new_stg_idx$;

    EXECUTE format('TRUNCATE TABLE %I.%I', v_schema, v_stg);

    /**********************************************************************
     * 5) Log success
     **********************************************************************/
    UPDATE S3_SYNC_LOG
       SET finish_time = now(),
           status      = 'SUCCESS',
           rows_loaded = COALESCE(v_rows_stg, 0)
     WHERE id = v_log_id;

EXCEPTION WHEN OTHERS THEN
    UPDATE S3_SYNC_LOG
       SET finish_time   = now(),
           status        = 'FAILED',
           error_message = substr(SQLSTATE || ': ' || SQLERRM, 1, 2000)
     WHERE id = v_log_id;
    RAISE;
END;
$$;