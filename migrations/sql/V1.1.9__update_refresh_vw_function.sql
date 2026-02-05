-- Refreshes all AQI lookup materialized views.
-- Safe to call inside other functions/transactions (NO CONCURRENTLY here).

CREATE OR REPLACE FUNCTION refresh_aqi_lookup_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Location & org fields
    REFRESH MATERIALIZED VIEW mv_aqi_sampling_agency;
    REFRESH MATERIALIZED VIEW mv_aqi_project;
    REFRESH MATERIALIZED VIEW mv_aqi_work_order_number;
    REFRESH MATERIALIZED VIEW mv_aqi_location_type;
    REFRESH MATERIALIZED VIEW mv_aqi_location_group;
    REFRESH MATERIALIZED VIEW mv_aqi_location_collection;

    -- Field/sample attributes
    REFRESH MATERIALIZED VIEW mv_aqi_collection_method;
    REFRESH MATERIALIZED VIEW mv_aqi_medium;

    -- Observed property & chemistry metadata
    REFRESH MATERIALIZED VIEW mv_aqi_observed_property_id;
    REFRESH MATERIALIZED VIEW mv_aqi_observed_property_name;
    REFRESH MATERIALIZED VIEW mv_aqi_observed_property_description;
    REFRESH MATERIALIZED VIEW mv_aqi_observed_property_analysis_type;
    REFRESH MATERIALIZED VIEW mv_aqi_observed_property_result_type;

    -- Result metrics & units
    REFRESH MATERIALIZED VIEW mv_aqi_data_classification;

    -- Lab / analysis metadata
    REFRESH MATERIALIZED VIEW mv_aqi_analyzing_agency;
    REFRESH MATERIALIZED VIEW mv_aqi_analysis_method_collection;
    REFRESH MATERIALIZED VIEW mv_aqi_lab_batch_id;
    REFRESH MATERIALIZED VIEW mv_aqi_qc_type;
END;
$$;