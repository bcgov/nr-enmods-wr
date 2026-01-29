import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { FileInfo } from "./geodata/entities/file-info.entity";
import { Observation } from "./observations/entities/observation.entity";
import { AqiCsvImportOperational } from "./aqi-csv-import-operational/entities/aqi-csv-import-operational.entity";
import { MvAqiSamplingAgency } from "./materialized-views/mv_aqi_sampling_agency.entity";
import { MvAqiProject } from "./materialized-views/mv_aqi_project.entity";
import { MvAqiWorkOrderNumber } from "./materialized-views/mv_aqi_work_order_number.entity";
import { MvAqiLocationCollection } from "./materialized-views/mv_aqi_location_collection.entity";
import { MvAqiLocationType } from "./materialized-views/mv_aqi_location_type.entity";
import { MvAqiLocationGroup } from "./materialized-views/mv_aqi_location_groups.entity";
import { MvAqiCollectionMethod } from "./materialized-views/mv_aqi_collection_method.entity";
import { MvAqiMedium } from "./materialized-views/mv_aqi_medium.entity";
import { MvAqiObservedPropertyId } from "./materialized-views/mv_aqi_observed_property_id.entity";
import { MvAqiObservedPropertyName } from "./materialized-views/mv_aqi_observed_property_name.entity";
import { MvAqiObservedPropertyDescription } from "./materialized-views/mv_aqi_observed_property_description.entity";
import { MvAqiObservedPropertyResultType } from "./materialized-views/mv_aqi_observed_property_result_type.entity";
import { MvAqiObservedPropertyAnalysisType } from "./materialized-views/mv_aqi_observed_property_analysis_type.entity";
import { MvAqiDataClassification } from "./materialized-views/mv_aqi_data_classification.entity";
import { MvAqiAnalyzingAgency } from "./materialized-views/mv_aqi_analyzing_agency.entity";
import { MvAqiAnalysisMethodCollection } from "./materialized-views/mv_aqi_analysis_method_collection.entity";
import { MvAqiLabBatchId } from "./materialized-views/mv_aqi_lab_batch_id.entity";
import { MvAqiQcType } from "./materialized-views/mv_aqi_qc_type.entity";
import { S3SyncLog } from "./s3_sync_log/entities/s3_sync_log.entity";

const ormconfig: TypeOrmModuleOptions = {
  logging: ["error"],
  type: "postgres",
  host: process.env.POSTGRES_HOST || "postgres",
  port: 5432,
  database: process.env.POSTGRES_DATABASE || "enmodswr",
  username: process.env.POSTGRES_USER || "enmodswr",
  password: process.env.POSTGRES_PASSWORD || "enmodswr_password",
  entities: [
    FileInfo,
    Observation,
    AqiCsvImportOperational,
    MvAqiSamplingAgency,
    MvAqiProject,
    MvAqiWorkOrderNumber,
    MvAqiLocationCollection,
    MvAqiLocationType,
    MvAqiLocationGroup,
    MvAqiCollectionMethod,
    MvAqiMedium,
    MvAqiObservedPropertyId,
    MvAqiObservedPropertyName,
    MvAqiObservedPropertyDescription,
    MvAqiObservedPropertyResultType,
    MvAqiObservedPropertyAnalysisType,
    MvAqiDataClassification,
    MvAqiAnalyzingAgency,
    MvAqiAnalysisMethodCollection,
    MvAqiLabBatchId,
    MvAqiQcType,
    S3SyncLog,
  ],
  synchronize: false,
};
export default ormconfig;
