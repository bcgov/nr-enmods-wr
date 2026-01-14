-- Update Location_Group materialized view to split comma-separated values
-- This script splits values like "1,5,2." into individual records (1, 5, 2)
-- and eliminates duplicates
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_location_group CASCADE;

CREATE MATERIALIZED VIEW mv_aqi_location_group AS
SELECT DISTINCT
  TRIM(value) AS Location_Group
FROM
  AQI_CSV_IMPORT_STAGING,
  LATERAL UNNEST (STRING_TO_ARRAY (Location_Group, ',')) AS value
WHERE
  Location_Group IS NOT NULL
  AND TRIM(value) != ''
ORDER BY
  Location_Group;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_location_group ON mv_aqi_location_group (Location_Group);