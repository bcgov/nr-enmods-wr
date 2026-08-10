ALTER TABLE aqi_csv_import_staging
ALTER COLUMN Lab_Quality_Flag TYPE VARCHAR(255);

ALTER TABLE aqi_csv_import_operational
ALTER COLUMN Lab_Quality_Flag TYPE VARCHAR(255);