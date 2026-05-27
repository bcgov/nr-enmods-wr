ALTER TABLE aqi_csv_import_staging
ALTER COLUMN Lab_Comment TYPE VARCHAR(3000);

ALTER TABLE aqi_csv_import_operational
ALTER COLUMN Lab_Comment TYPE VARCHAR(3000);