-- Observed_Property_Description
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_observed_property_description;

ALTER TABLE aqi_csv_import_staging
ALTER COLUMN Observed_Property_Description TYPE VARCHAR(512);

ALTER TABLE aqi_csv_import_operational
ALTER COLUMN Observed_Property_Description TYPE VARCHAR(512);


CREATE MATERIALIZED VIEW mv_aqi_observed_property_description AS
SELECT DISTINCT Observed_Property_Description
FROM AQI_CSV_IMPORT_STAGING
WHERE Observed_Property_Description IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_observed_property_description
  ON mv_aqi_observed_property_description (Observed_Property_Description);


  