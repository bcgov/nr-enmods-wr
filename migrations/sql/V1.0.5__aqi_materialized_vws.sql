-- Create materialized views with distinct values for WR lookups
-- Schema: public
-- Source table: AQI_CSV_IMPORT_STAGING

-- Helper: create MV and unique index for a single column

-- ===========================
-- Sampling_Agency
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_sampling_agency;
CREATE MATERIALIZED VIEW mv_aqi_sampling_agency AS
SELECT DISTINCT Sampling_Agency
FROM AQI_CSV_IMPORT_STAGING
WHERE Sampling_Agency IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_sampling_agency
  ON mv_aqi_sampling_agency (Sampling_Agency);

-- Project
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_project;
CREATE MATERIALIZED VIEW mv_aqi_project AS
SELECT DISTINCT 
  Project, 
  Project_Name
FROM AQI_CSV_IMPORT_STAGING
WHERE Project IS NOT NULL
AND Project_Name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_project
  ON mv_aqi_project (Project, Project_Name);

-- Work_Order_Number
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_work_order_number;
CREATE MATERIALIZED VIEW mv_aqi_work_order_number AS
SELECT DISTINCT Work_Order_Number
FROM AQI_CSV_IMPORT_STAGING
WHERE Work_Order_Number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_work_order_number
  ON mv_aqi_work_order_number (Work_Order_Number);

-- LocationType
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_locationTtype;
CREATE MATERIALIZED VIEW mv_aqi_locationType AS
SELECT DISTINCT LocationType
FROM AQI_CSV_IMPORT_STAGING
WHERE LocationType IS NOT NULL; 

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_locationType
  ON mv_aqi_locationType (LocationType);

-- Location_Group
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_location_group;
CREATE MATERIALIZED VIEW mv_aqi_location_group AS
SELECT DISTINCT Location_Group
FROM AQI_CSV_IMPORT_STAGING
WHERE Location_Group IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_location_group
  ON mv_aqi_location_group (Location_Group);

-- Combine location id and name as they are 1-1 mapping??
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_location_collection;
CREATE MATERIALIZED VIEW mv_aqi_location_collection AS
SELECT DISTINCT
    Location_ID,
    Location_Name
FROM AQI_CSV_IMPORT_STAGING
WHERE Location_ID IS NOT NULL
  AND Location_Name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_location_collection
  ON mv_aqi_location_collection (Location_ID, Location_Name);

-- Collection_Method
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_collection_method;
CREATE MATERIALIZED VIEW mv_aqi_collection_method AS
SELECT DISTINCT Collection_Method
FROM AQI_CSV_IMPORT_STAGING
WHERE Collection_Method IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_collection_method
  ON mv_aqi_collection_method (Collection_Method);

-- Medium
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_medium;
CREATE MATERIALIZED VIEW mv_aqi_medium AS
SELECT DISTINCT Medium
FROM AQI_CSV_IMPORT_STAGING
WHERE Medium IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_medium
  ON mv_aqi_medium (Medium);

-- Observed_Property_ID
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_observed_property_id;
CREATE MATERIALIZED VIEW mv_aqi_observed_property_id AS
SELECT DISTINCT Observed_Property_ID
FROM AQI_CSV_IMPORT_STAGING
WHERE Observed_Property_ID IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_observed_property_id
  ON mv_aqi_observed_property_id (Observed_Property_ID);

-- Observed_Property_Name
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_observed_property_name;
CREATE MATERIALIZED VIEW mv_aqi_observed_property_name AS
SELECT DISTINCT Observed_Property_Name
FROM AQI_CSV_IMPORT_STAGING
WHERE Observed_Property_Name IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_observed_property_name
  ON mv_aqi_observed_property_name (Observed_Property_Name);

-- Observed_Property_Description
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_observed_property_description;
CREATE MATERIALIZED VIEW mv_aqi_observed_property_description AS
SELECT DISTINCT Observed_Property_Description
FROM AQI_CSV_IMPORT_STAGING
WHERE Observed_Property_Description IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_observed_property_description
  ON mv_aqi_observed_property_description (Observed_Property_Description);

-- Observed_Property_Analysis_Type
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_observed_property_analysis_type;
CREATE MATERIALIZED VIEW mv_aqi_observed_property_analysis_type AS
SELECT DISTINCT Observed_Property_Analysis_Type
FROM AQI_CSV_IMPORT_STAGING
WHERE Observed_Property_Analysis_Type IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_observed_property_analysis_type
  ON mv_aqi_observed_property_analysis_type (Observed_Property_Analysis_Type);

-- Observed_Property_Result_Type
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_observed_property_result_type;
CREATE MATERIALIZED VIEW mv_aqi_observed_property_result_type AS
SELECT DISTINCT Observed_Property_Result_Type
FROM AQI_CSV_IMPORT_STAGING
WHERE Observed_Property_Result_Type IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_observed_property_result_type
  ON mv_aqi_observed_property_result_type (Observed_Property_Result_Type);

-- Data_Classification
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_data_classification;
CREATE MATERIALIZED VIEW mv_aqi_data_classification AS
SELECT DISTINCT Data_Classification
FROM AQI_CSV_IMPORT_STAGING
WHERE Data_Classification IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_data_classification
  ON mv_aqi_data_classification (Data_Classification);

-- Combine analyzing agency fields
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_analyzing_agency;
CREATE MATERIALIZED VIEW mv_aqi_analyzing_agency AS
SELECT DISTINCT
    Analyzing_Agency,
    Analyzing_Agency_Full_Name
FROM AQI_CSV_IMPORT_STAGING
WHERE Analyzing_Agency IS NOT NULL
  AND Analyzing_Agency_Full_Name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_analyzing_agency
  ON mv_aqi_analyzing_agency (Analyzing_Agency, Analyzing_Agency_Full_Name);

-- Combined analysis method fields
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_analysis_method;
CREATE MATERIALIZED VIEW mv_aqi_analysis_method AS
SELECT DISTINCT
    Analysis_Method
FROM AQI_CSV_IMPORT_STAGING
WHERE Analysis_Method IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_analysis_method
  ON mv_aqi_analysis_method (Analysis_Method);

-- Lab_Batch_ID
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_lab_batch_id;
CREATE MATERIALIZED VIEW mv_aqi_lab_batch_id AS
SELECT DISTINCT Lab_Batch_ID
FROM AQI_CSV_IMPORT_STAGING
WHERE Lab_Batch_ID IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_lab_batch_id
  ON mv_aqi_lab_batch_id (Lab_Batch_ID);

-- QC_Type
DROP MATERIALIZED VIEW IF EXISTS mv_aqi_qc_type;
CREATE MATERIALIZED VIEW mv_aqi_qc_type AS
SELECT DISTINCT QC_Type
FROM AQI_CSV_IMPORT_STAGING
WHERE QC_Type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_aqi_qc_type
  ON mv_aqi_qc_type (QC_Type);
