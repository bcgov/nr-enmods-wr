-- LocationType
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_locationTtype;
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_locationType;

CREATE MATERIALIZED VIEW mv_aqi_location_type AS
SELECT DISTINCT Location_Type
FROM AQI_CSV_IMPORT_STAGING
WHERE Location_Type IS NOT NULL; 

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_location_type
  ON mv_aqi_location_type (Location_Type);