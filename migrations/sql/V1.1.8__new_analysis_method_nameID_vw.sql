DROP MATERIALIZED VIEW IF EXISTS mv_aqi_analysis_method;
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_analysis_method_collection;
CREATE MATERIALIZED VIEW mv_aqi_analysis_method_collection AS
SELECT DISTINCT
    Analysis_Method_ID,
    Analysis_Method
FROM AQI_CSV_IMPORT_STAGING
WHERE Analysis_Method IS NOT NULL
  AND Analysis_Method_ID IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_analysis_method_collection
  ON mv_aqi_analysis_method_collection (Analysis_Method_ID, Analysis_Method);