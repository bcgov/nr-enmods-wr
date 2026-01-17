-- V21__create_aqi_swap_with_prebuilt_indexes.sql
-- Swap pattern with indexes rebuilt on STAGING before promotion.
-- Result: WR queries see a fully indexed OPERATIONAL immediately after swap.

CREATE OR REPLACE FUNCTION run_aqi_table_swap(
    p_process_name TEXT DEFAULT 'public.AQI_AWS_S3_SYNC',
    p_folder_name   text DEFAULT ''                     -- optional prefix/folder
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
       AND status = 'SUCCESS'
     ORDER BY start_time DESC
     LIMIT 1;

     RAISE NOTICE 'FOUND LOG ID: %', v_log_id;

    IF v_log_id IS NULL THEN
        INSERT INTO S3_SYNC_LOG(process_name, status, start_time, source_folder)
        VALUES (p_process_name, 'IN_PROGRESS', now(), p_folder_name)
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
    RAISE NOTICE 'Starting index cleanup on STAGING table.';
    -- Drop all possible staging indexes for every column in aqi_csv_import_staging
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_ministry_contact') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_ministry_contact';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_ministry_contact';
        END IF;
    -- ...repeat RAISE NOTICE for each index drop...
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_sampling_agency') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_sampling_agency';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_sampling_agency';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_project') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_project';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_project';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_project_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_project_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_project_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_work_order_number') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_work_order_number';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_work_order_number';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_type';   
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_latitude') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_latitude';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_latitude';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_longitude') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_longitude';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_longitude';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_elevation') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_elevation';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_elevation';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_elevation_units') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_elevation_units';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_elevation_units';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_group') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_group';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_group';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_visit_start_time') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_visit_start_time';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_visit_start_time';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_visit_end_time') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_visit_end_time';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_visit_end_time';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_visit_participants') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_visit_participants';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_visit_participants';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_comment') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_comment';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_comment';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_filtered') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_filtered';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_filtered';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_filtered_comment') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_filtered_comment';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_filtered_comment';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_preservative') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_preservative';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_preservative';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_device_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_device_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_device_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_device_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_device_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_device_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_sampling_context_tag') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_sampling_context_tag';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_sampling_context_tag';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_collection_method') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_collection_method';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_collection_method';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_medium') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_medium';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_medium';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_taxonomy') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_taxonomy';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_taxonomy';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_taxonomy_common_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_taxonomy_common_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_taxonomy_common_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_depth_upper') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_depth_upper';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_depth_upper';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_depth_lower') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_depth_lower';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_depth_lower';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_depth_unit') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_depth_unit';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_depth_unit';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_date_time_start') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_date_time_start';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_date_time_start';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_date_time_end') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_date_time_end';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_date_time_end';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_description') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_description';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_description';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_analysis_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_analysis_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_analysis_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_result_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_result_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_result_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_name';  
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_cas_number') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_cas_number';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_cas_number';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_result_value') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_result_value';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_result_value';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_method_detection_limit') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_method_detection_limit';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_method_detection_limit';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_method_reporting_limit') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_method_reporting_limit';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_method_reporting_limit';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_result_unit') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_result_unit';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_result_unit';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_detection_condition') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_detection_condition';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_detection_condition';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_composite_stat') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_composite_stat';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_composite_stat';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_fraction') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_fraction';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_fraction';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_data_classification') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_data_classification';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_data_classification';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analyzing_agency') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analyzing_agency';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analyzing_agency';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analyzing_agency_full_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analyzing_agency_full_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analyzing_agency_full_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analysis_method') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analysis_method';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analysis_method';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analysis_method_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analysis_method_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analysis_method_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analyzed_date_time') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analyzed_date_time';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analyzed_date_time';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_result_status') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_result_status';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_result_status';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_result_grade') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_result_grade';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_result_grade';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_activity_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_activity_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_activity_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_tissue_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_tissue_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_tissue_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_arrival_temperature') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_arrival_temperature';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_arrival_temperature';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_specimen_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_specimen_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_specimen_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_quality_flag') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_quality_flag';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_quality_flag';
        END IF;
        -- IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_arrival_date_time') THEN
        --     RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_arrival_date_time';
        --     EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_arrival_date_time';
        -- END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_prepared_date_time') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_prepared_date_time';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_prepared_date_time';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_sample_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_sample_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_sample_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_dilution_factor') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_dilution_factor';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_dilution_factor';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_comment') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_comment';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_comment';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_batch_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_batch_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_batch_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_qc_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_qc_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_qc_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_qc_source_activity_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_qc_source_activity_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_qc_source_activity_name';
        END IF;
    END
    $drop_stg_idx$;

    -- Build fresh staging indexes (tune the set as your WR filters evolve)
    RAISE NOTICE 'Creating index: idx_aqi_stg_ministry_contact';
    EXECUTE format('CREATE INDEX idx_aqi_stg_ministry_contact                  ON %I.%I (Ministry_Contact)',                          v_schema, v_stg);
    -- ...repeat RAISE NOTICE for each index creation...
    RAISE NOTICE 'Creating index: idx_aqi_stg_sampling_agency';
    EXECUTE format('CREATE INDEX idx_aqi_stg_sampling_agency                   ON %I.%I (Sampling_Agency)',                           v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_project';
    EXECUTE format('CREATE INDEX idx_aqi_stg_project                           ON %I.%I (Project)',                                   v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_project_name';
    EXECUTE format('CREATE INDEX idx_aqi_stg_project_name                      ON %I.%I (Project_Name)',                              v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_work_order_number';
    EXECUTE format('CREATE INDEX idx_aqi_stg_work_order_number                 ON %I.%I (Work_Order_Number)',                         v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_location_id';
    EXECUTE format('CREATE INDEX idx_aqi_stg_location_id                       ON %I.%I (Location_ID)',                               v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_location_name';
    EXECUTE format('CREATE INDEX idx_aqi_stg_location_name                     ON %I.%I (Location_Name)',                             v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_location_type';
    EXECUTE format('CREATE INDEX idx_aqi_stg_location_type                      ON %I.%I (Location_Type)',                             v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_location_latitude';
    EXECUTE format('CREATE INDEX idx_aqi_stg_location_latitude                 ON %I.%I (Location_Latitude)',                         v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_location_longitude';
    EXECUTE format('CREATE INDEX idx_aqi_stg_location_longitude                ON %I.%I (Location_Longitude)',                        v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_location_elevation';
    EXECUTE format('CREATE INDEX idx_aqi_stg_location_elevation                ON %I.%I (Location_Elevation)',                        v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_location_elevation_units';
    EXECUTE format('CREATE INDEX idx_aqi_stg_location_elevation_units           ON %I.%I (Location_Elevation_Units)',                   v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_location_group';
    EXECUTE format('CREATE INDEX idx_aqi_stg_location_group                   ON %I.%I (Location_Group)',                           v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_visit_start_time';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_visit_start_time            ON %I.%I (Field_Visit_Start_Time)',                    v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_visit_end_time';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_visit_end_time              ON %I.%I (Field_Visit_End_Time)',                      v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_visit_participants';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_visit_participants          ON %I.%I (Field_Visit_Participants)',                  v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_comment';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_comment              ON %I.%I (Field_Comment)',                      v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_filtered';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_filtered                    ON %I.%I (Field_Filtered)',                            v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_filtered_comment';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_filtered_comment            ON %I.%I (Field_Filtered_Comment)',                    v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_preservative';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_preservative                ON %I.%I (Field_Preservative)',                        v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_device_id';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_device_id                   ON %I.%I (Field_Device_ID)',                           v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_field_device_type';
    EXECUTE format('CREATE INDEX idx_aqi_stg_field_device_type                 ON %I.%I (Field_Device_Type)',                         v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_sampling_context_tag';
    EXECUTE format('CREATE INDEX idx_aqi_stg_sampling_context_tag              ON %I.%I (Sampling_Context_Tag)',                      v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_collection_method';
    EXECUTE format('CREATE INDEX idx_aqi_stg_collection_method                 ON %I.%I (Collection_Method)',                         v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_medium';
    EXECUTE format('CREATE INDEX idx_aqi_stg_medium                            ON %I.%I (Medium)',                                    v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_taxonomy';
    EXECUTE format('CREATE INDEX idx_aqi_stg_taxonomy                          ON %I.%I (Taxonomy)',                                  v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_taxonomy_common_name';
    EXECUTE format('CREATE INDEX idx_aqi_stg_taxonomy_common_name              ON %I.%I (Taxonomy_Common_Name)',                      v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_depth_upper';
    EXECUTE format('CREATE INDEX idx_aqi_stg_depth_upper                       ON %I.%I (Depth_Upper)',                               v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_depth_lower';
    EXECUTE format('CREATE INDEX idx_aqi_stg_depth_lower                       ON %I.%I (Depth_Lower)',                               v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_depth_unit';
    EXECUTE format('CREATE INDEX idx_aqi_stg_depth_unit                        ON %I.%I (Depth_Unit)',                                v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_observed_date_time_start';
    EXECUTE format('CREATE INDEX idx_aqi_stg_observed_date_time_start          ON %I.%I (Observed_Date_Time_Start)',                  v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_observed_date_time_end';
    EXECUTE format('CREATE INDEX idx_aqi_stg_observed_date_time_end            ON %I.%I (Observed_Date_Time_End)',                    v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_observed_property_id';
    EXECUTE format('CREATE INDEX idx_aqi_stg_observed_property_id              ON %I.%I (Observed_Property_Id)',                      v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_observed_property_description';
    EXECUTE format('CREATE INDEX idx_aqi_stg_observed_property_description     ON %I.%I (Observed_Property_Description)',             v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_observed_property_analysis_type';
    EXECUTE format('CREATE INDEX idx_aqi_stg_observed_property_analysis_type   ON %I.%I (Observed_Property_Analysis_Type)',           v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_observed_property_result_type';
    EXECUTE format('CREATE INDEX idx_aqi_stg_observed_property_result_type     ON %I.%I (Observed_Property_Result_Type)',             v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_observed_property_name';
    EXECUTE format('CREATE INDEX idx_aqi_stg_observed_property_name            ON %I.%I (Observed_Property_Name)',                    v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_cas_number';
    EXECUTE format('CREATE INDEX idx_aqi_stg_cas_number                        ON %I.%I (CAS_Number)',                                v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_result_value';
    EXECUTE format('CREATE INDEX idx_aqi_stg_result_value                      ON %I.%I (Result_Value)',                              v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_method_detection_limit';
    EXECUTE format('CREATE INDEX idx_aqi_stg_method_detection_limit            ON %I.%I (Method_Detection_Limit)',                    v_schema, v_stg); 

    RAISE NOTICE 'Creating index: idx_aqi_stg_method_reporting_limit';
    EXECUTE format('CREATE INDEX idx_aqi_stg_method_reporting_limit            ON %I.%I (Method_Reporting_Limit)',                    v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_result_unit';
    EXECUTE format('CREATE INDEX idx_aqi_stg_result_unit                       ON %I.%I (Result_Unit)',                               v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_detection_condition';
    EXECUTE format('CREATE INDEX idx_aqi_stg_detection_condition               ON %I.%I (Detection_Condition)',                       v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_composite_stat';
    EXECUTE format('CREATE INDEX idx_aqi_stg_composite_stat                    ON %I.%I (Composite_Stat)',                            v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_fraction';
    EXECUTE format('CREATE INDEX idx_aqi_stg_fraction                          ON %I.%I (Fraction)',                                  v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_data_classification';
    EXECUTE format('CREATE INDEX idx_aqi_stg_data_classification               ON %I.%I (Data_Classification)',                       v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_analyzing_agency';
    EXECUTE format('CREATE INDEX idx_aqi_stg_analyzing_agency                  ON %I.%I (Analyzing_Agency)',                          v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_analyzing_agency_full_name';
    EXECUTE format('CREATE INDEX idx_aqi_stg_analyzing_agency_full_name        ON %I.%I (Analyzing_Agency_Full_Name)',                v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_analysis_method';
    EXECUTE format('CREATE INDEX idx_aqi_stg_analysis_method                   ON %I.%I (Analysis_Method)',                           v_schema, v_stg);

    -- RAISE NOTICE 'Creating index: idx_aqi_stg_analysis_method_name';
    -- EXECUTE format('CREATE INDEX idx_aqi_stg_analysis_method_name              ON %I.%I (Analyzed_Method_Name)',                      v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_analyzed_date_time';
    EXECUTE format('CREATE INDEX idx_aqi_stg_analyzed_date_time                ON %I.%I (Analyzed_Date_Time)',                        v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_result_status';
    EXECUTE format('CREATE INDEX idx_aqi_stg_result_status                     ON %I.%I (Result_Status)',                             v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_result_grade';
    EXECUTE format('CREATE INDEX idx_aqi_stg_result_grade                      ON %I.%I (Result_Grade)',                              v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_activity_name';
    EXECUTE format('CREATE INDEX idx_aqi_stg_activity_name                     ON %I.%I (Activity_Name)',                             v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_tissue_type';
    EXECUTE format('CREATE INDEX idx_aqi_stg_tissue_type                       ON %I.%I (Tissue_Type)',                               v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_lab_arrival_temperature';
    EXECUTE format('CREATE INDEX idx_aqi_stg_lab_arrival_temperature           ON %I.%I (Lab_Arrival_Temperature)',                   v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_specimen_name';
    EXECUTE format('CREATE INDEX idx_aqi_stg_specimen_name                     ON %I.%I (Specimen_Name)',                             v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_lab_quality_flag';
    EXECUTE format('CREATE INDEX idx_aqi_stg_lab_quality_flag                  ON %I.%I (Lab_Quality_Flag)',                          v_schema, v_stg);

    -- RAISE NOTICE 'Creating index: idx_aqi_stg_lab_arrival_date_time';
    -- EXECUTE format('CREATE INDEX idx_aqi_stg_lab_arrival_date_time          ON %I.%I (Lab_Arrival_Date_Time)',                     v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_lab_prepared_date_time';
    EXECUTE format('CREATE INDEX idx_aqi_stg_lab_prepared_date_time            ON %I.%I (Lab_Prepared_Date_Time)',                    v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_lab_sample_id';
    EXECUTE format('CREATE INDEX idx_aqi_stg_lab_sample_id                     ON %I.%I (Lab_Sample_ID)',                             v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_lab_dilution_factor';
    EXECUTE format('CREATE INDEX idx_aqi_stg_lab_dilution_factor               ON %I.%I (Lab_Dilution_Factor)',                       v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_lab_comment';
    EXECUTE format('CREATE INDEX idx_aqi_stg_lab_comment                       ON %I.%I (Lab_Comment)',                               v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_lab_batch_id';
    EXECUTE format('CREATE INDEX idx_aqi_stg_lab_batch_id                      ON %I.%I (Lab_Batch_ID)',                              v_schema, v_stg); 

    RAISE NOTICE 'Creating index: idx_aqi_stg_qc_type';
    EXECUTE format('CREATE INDEX idx_aqi_stg_qc_type                           ON %I.%I (QC_Type)',                                   v_schema, v_stg);

    RAISE NOTICE 'Creating index: idx_aqi_stg_qc_source_activity_name';
    EXECUTE format('CREATE INDEX idx_aqi_stg_qc_source_activity_name           ON %I.%I (QC_Source_Activity_Name)',                   v_schema, v_stg);

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
    RAISE NOTICE 'Checking for presence of refresh_aqi_lookup_materialized_views() function.';
    PERFORM 1 FROM pg_proc WHERE proname = 'refresh_aqi_lookup_materialized_views';
    IF FOUND THEN
        RAISE NOTICE 'Function found. Refreshing AQI lookup materialized views.';
        PERFORM refresh_aqi_lookup_materialized_views();
    END IF;

    /**********************************************************************
     * 4) New STAGING cleanup: drop its (now old) indexes and truncate
     **********************************************************************/
    DO $drop_new_stg_idx$
    BEGIN
    RAISE NOTICE 'Starting index cleanup on STAGING table.';
    -- Drop all possible staging indexes for every column in aqi_csv_import_staging
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_ministry_contact') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_ministry_contact';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_ministry_contact';
        END IF;
    -- ...repeat RAISE NOTICE for each index drop...
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_sampling_agency') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_sampling_agency';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_sampling_agency';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_project') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_project';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_project';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_project_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_project_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_project_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_work_order_number') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_work_order_number';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_work_order_number';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_type';   
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_latitude') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_latitude';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_latitude';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_longitude') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_longitude';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_longitude';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_elevation') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_elevation';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_elevation';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_elevation_units') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_elevation_units';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_elevation_units';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_location_group') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_location_group';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_location_group';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_visit_start_time') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_visit_start_time';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_visit_start_time';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_visit_end_time') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_visit_end_time';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_visit_end_time';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_visit_participants') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_visit_participants';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_visit_participants';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_comment') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_comment';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_comment';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_filtered') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_filtered';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_filtered';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_filtered_comment') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_filtered_comment';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_filtered_comment';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_preservative') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_preservative';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_preservative';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_device_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_device_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_device_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_field_device_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_field_device_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_field_device_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_sampling_context_tag') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_sampling_context_tag';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_sampling_context_tag';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_collection_method') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_collection_method';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_collection_method';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_medium') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_medium';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_medium';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_taxonomy') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_taxonomy';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_taxonomy';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_taxonomy_common_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_taxonomy_common_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_taxonomy_common_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_depth_upper') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_depth_upper';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_depth_upper';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_depth_lower') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_depth_lower';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_depth_lower';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_depth_unit') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_depth_unit';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_depth_unit';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_date_time_start') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_date_time_start';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_date_time_start';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_date_time_end') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_date_time_end';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_date_time_end';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_description') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_description';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_description';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_analysis_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_analysis_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_analysis_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_result_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_result_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_result_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_observed_property_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_observed_property_name';  
            EXECUTE 'DROP INDEX public.idx_aqi_stg_observed_property_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_cas_number') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_cas_number';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_cas_number';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_result_value') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_result_value';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_result_value';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_method_detection_limit') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_method_detection_limit';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_method_detection_limit';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_method_reporting_limit') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_method_reporting_limit';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_method_reporting_limit';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_result_unit') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_result_unit';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_result_unit';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_detection_condition') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_detection_condition';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_detection_condition';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_composite_stat') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_composite_stat';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_composite_stat';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_fraction') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_fraction';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_fraction';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_data_classification') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_data_classification';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_data_classification';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analyzing_agency') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analyzing_agency';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analyzing_agency';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analyzing_agency_full_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analyzing_agency_full_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analyzing_agency_full_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analysis_method') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analysis_method';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analysis_method';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analysis_method_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analysis_method_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analysis_method_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_analyzed_date_time') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_analyzed_date_time';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_analyzed_date_time';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_result_status') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_result_status';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_result_status';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_result_grade') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_result_grade';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_result_grade';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_activity_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_activity_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_activity_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_tissue_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_tissue_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_tissue_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_arrival_temperature') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_arrival_temperature';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_arrival_temperature';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_specimen_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_specimen_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_specimen_name';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_quality_flag') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_quality_flag';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_quality_flag';
        END IF;
        -- IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_arrival_date_time') THEN
        --     RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_arrival_date_time';
        --     EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_arrival_date_time';
        -- END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_prepared_date_time') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_prepared_date_time';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_prepared_date_time';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_sample_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_sample_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_sample_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_dilution_factor') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_dilution_factor';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_dilution_factor';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_comment') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_comment';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_comment';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_lab_batch_id') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_lab_batch_id';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_lab_batch_id';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_qc_type') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_qc_type';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_qc_type';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_aqi_stg_qc_source_activity_name') THEN
            RAISE NOTICE 'Dropping index: idx_aqi_stg_qc_source_activity_name';
            EXECUTE 'DROP INDEX public.idx_aqi_stg_qc_source_activity_name';
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