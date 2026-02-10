import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { BasicSearchDto } from "./dto/basicSearch.dto";
import { join } from "path";
import * as fs from "fs";
import * as fastcsv from "@fast-csv/format";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource } from "typeorm";
import { Observation } from "../observations/entities/observation.entity";
import { promisify } from "util";
import { jobs } from "src/jobs/searchjob";
import { pipeline } from "stream/promises";

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Observation)
    private readonly observationRepository: Repository<Observation>,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger("ObservationSearchService");
  private readonly DIR_NAME = "/data/";
  private readonly MAX_API_DATA_LIMIT = 100_000;

  /**
   * Builds the SQL WHERE clause and parameters array based on the provided search criteria.
   * @param basicSearchDto - The search criteria DTO
   * @returns An object containing the SQL WHERE clause and parameters array
   */
  public async formulateSqlQuery(basicSearchDto: BasicSearchDto) {
    const whereClause: string[] = [];
    const params: any[] = [];

    // Apply filters based on basicSearchDto
    if (
      basicSearchDto.locationName &&
      basicSearchDto.locationName.length >= 1
    ) {
      whereClause.push(`location_id = ANY($${params.length + 1})`);
      params.push(basicSearchDto.locationName);
    }

    if (basicSearchDto.locationType) {
      whereClause.push(`location_type = $${params.length + 1}`);
      params.push(basicSearchDto.locationType.customId);
    }

    if (
      basicSearchDto.permitNumber &&
      basicSearchDto.permitNumber.length >= 1
    ) {
      // Split comma-separated values in permitNumber array to match split dropdowns
      const expandedPermitNumbers = basicSearchDto.permitNumber.flatMap(
        (permit) => permit.split(",").map((p) => p.trim()),
      );
      // Use regex pattern to match location_group values that contain any of the selected permit numbers
      // This handles both split values (e.g., "1") and comma-separated values (e.g., "1,2,3")
      const patterns = expandedPermitNumbers.map(
        (num) => `(^|,)\\s*${num}\\s*($|,)`,
      );
      const orConditions = patterns
        .map((_, i) => `location_group ~ $${params.length + 1 + i}`)
        .join(" OR ");
      whereClause.push(`(${orConditions})`);
      patterns.forEach((pattern) => params.push(pattern));
    }

    if (basicSearchDto.fromDate && basicSearchDto.toDate) {
      const fromDateWithTime = new Date(basicSearchDto.fromDate);
      const fromDate = `${fromDateWithTime.getFullYear()}-${(fromDateWithTime.getMonth() + 1).toString().padStart(2, "0")}-${fromDateWithTime.getDate().toString().padStart(2, "0")}`;
      whereClause.push(`observed_date_time >= $${params.length + 1}`);
      params.push(fromDate);

      const toDateWithTime = new Date(basicSearchDto.toDate);
      const toDate = `${toDateWithTime.getFullYear()}-${(toDateWithTime.getMonth() + 1).toString().padStart(2, "0")}-${toDateWithTime.getDate().toString().padStart(2, "0")}`;
      whereClause.push(`observed_date_time <= $${params.length + 1}`);
      params.push(toDate);
    } else if (basicSearchDto.fromDate) {
      const fromDateWithTime = new Date(basicSearchDto.fromDate);
      const fromDate = `${fromDateWithTime.getFullYear()}-${(fromDateWithTime.getMonth() + 1).toString().padStart(2, "0")}-${fromDateWithTime.getDate().toString().padStart(2, "0")}`;
      whereClause.push(`observed_date_time >= $${params.length + 1}`);
      params.push(fromDate);
    } else if (basicSearchDto.toDate) {
      const toDateWithTime = new Date(basicSearchDto.toDate);
      const toDate = `${toDateWithTime.getFullYear()}-${(toDateWithTime.getMonth() + 1).toString().padStart(2, "0")}-${toDateWithTime.getDate().toString().padStart(2, "0")}`;
      whereClause.push(`observed_date_time <= $${params.length + 1}`);
      params.push(toDate);
    }

    if (basicSearchDto.media && basicSearchDto.media.length >= 1) {
      whereClause.push(`medium = ANY($${params.length + 1})`);
      params.push(basicSearchDto.media);
    }

    if (
      basicSearchDto.observedProperty &&
      basicSearchDto.observedProperty.length >= 1
    ) {
      whereClause.push(`observed_property_id = ANY($${params.length + 1})`);
      params.push(basicSearchDto.observedProperty);
    }

    if (
      basicSearchDto.workedOrderNo &&
      basicSearchDto.workedOrderNo.length >= 1
    ) {
      const validOrderNumbers = basicSearchDto.workedOrderNo
        .filter((order: any) => order && order.text)
        .map((order: any) => order.text);
      if (validOrderNumbers.length > 0) {
        whereClause.push(`work_order_number = ANY($${params.length + 1})`);
        params.push(validOrderNumbers);
      }
    }

    if (
      basicSearchDto.samplingAgency &&
      basicSearchDto.samplingAgency.length >= 1
    ) {
      whereClause.push(`sampling_agency = ANY($${params.length + 1})`);
      params.push(basicSearchDto.samplingAgency);
    }

    if (
      basicSearchDto.analyzingAgency &&
      basicSearchDto.analyzingAgency.length >= 1
    ) {
      whereClause.push(`analyzing_agency = ANY($${params.length + 1})`);
      params.push(basicSearchDto.analyzingAgency);
    }

    if (basicSearchDto.projects && basicSearchDto.projects.length >= 1) {
      whereClause.push(`project = ANY($${params.length + 1})`);
      params.push(basicSearchDto.projects);
    }

    if (
      basicSearchDto.analyticalMethod &&
      basicSearchDto.analyticalMethod.length >= 1
    ) {
      whereClause.push(`analysis_method_id = ANY($${params.length + 1})`);
      params.push(basicSearchDto.analyticalMethod);
    }

    if (
      basicSearchDto.collectionMethod &&
      basicSearchDto.collectionMethod.length >= 1
    ) {
      whereClause.push(`collection_method = ANY($${params.length + 1})`);
      params.push(basicSearchDto.collectionMethod);
    }

    if (
      basicSearchDto.qcSampleType &&
      basicSearchDto.qcSampleType.length >= 1
    ) {
      whereClause.push(`qc_type = ANY($${params.length + 1})`);
      params.push(basicSearchDto.qcSampleType);
    }

    if (
      basicSearchDto.dataClassification &&
      basicSearchDto.dataClassification.length >= 1
    ) {
      whereClause.push(`data_classification = ANY($${params.length + 1})`);
      params.push(basicSearchDto.dataClassification);
    }

    if (basicSearchDto.sampleDepth) {
      let decimalVal = basicSearchDto.sampleDepth

      if (/^-?\d+$/.test(basicSearchDto.sampleDepth)) {
        decimalVal = `${basicSearchDto.sampleDepth}.0`
      }
      whereClause.push(`depth_upper = $${params.length + 1}`);
      params.push(decimalVal);
    }

    if (basicSearchDto.labBatchId) {
      whereClause.push(`lab_batch_id = $${params.length + 1}`);
      params.push(basicSearchDto.labBatchId);
    }

    if (basicSearchDto.specimenId) {
      whereClause.push(`specimen_name = $${params.length + 1}`);
      params.push(basicSearchDto.specimenId);
    }

    const whereSql = whereClause.length
      ? `WHERE ${whereClause.join(" AND ")}`
      : "";

    this.logger.log("Generated SQL WHERE clause: " + whereSql);
    this.logger.log("With parameters: " + JSON.stringify(params));
    return { whereSql, params };
  }

  /**
   * Streams the results of a database query to a CSV file using the provided search criteria.
   * While streaming, collects statistics: record count, unique location IDs, min/max observation dates
   * @param basicSearchDto - The search criteria DTO
   * @param filePath - The file path to write the CSV to
   * @returns An object containing the stream, file path, status, and statistics
   */
  public async streamToCSV(basicSearchDto: BasicSearchDto, filePath: string) {
    const start = Date.now();
    try {
      const { whereSql, params } = await this.formulateSqlQuery(basicSearchDto);
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const sql = `SELECT *, CONCAT('''', location_group::text, '''') AS location_group FROM aqi_csv_import_operational ${whereSql}`;
      const stream = await queryRunner.stream(sql, params);

      const writeStream = fs.createWriteStream(filePath);
      const csvStream = fastcsv.format({ headers: true, quoteColumns: true });

      let rowCount = 0;
      let aborted = false;
      const uniqueLocations = new Set<string>();
      let minObservationDate: string | null = null;
      let maxObservationDate: string | null = null;

      let list_of_timecolumns = [
        "field_visit_start_time",
        "field_visit_end_time",
        "observed_date_time",
        "observed_date_time_start",
        "observed_date_time_end",
        "analyzed_date_time",
        "lab_arrival_date_time",
        "lab_prepared_date_time",
      ];

      // Listen for data events to count rows, collect statistics, and ensure ISO date/time
      stream.on("data", (row: any) => {
        rowCount++;

        // from the list of timecolumns, write the value as-is (no conversion)
        // This preserves the original string from the database
        // If the value is a Date object, convert to string without timezone conversion
        for (const col of list_of_timecolumns) {
          if (row[col]) {
            if (row[col] instanceof Date) {
              const d = row[col];
              const pad = (n: number, z = 2) => ("00" + n).slice(-z);
              row[col] =
                `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, "0")}-08:00`;
            } else {
              row[col] = `${row[col]}-08:00`;
            }
          }
        }

        // Track unique location IDs
        if (row.location_id) {
          uniqueLocations.add(String(row.location_id));
        }

        // Track min/max observation dates
        if (row.observed_date_time) {
          const dateStr =
            row.observed_date_time instanceof Date
              ? row.observed_date_time.toISOString()
              : String(row.observed_date_time);

          if (!minObservationDate || dateStr < minObservationDate) {
            minObservationDate = dateStr;
          }
          if (!maxObservationDate || dateStr > maxObservationDate) {
            maxObservationDate = dateStr;
          }
        }

        if (!aborted && rowCount > this.MAX_API_DATA_LIMIT) {
          aborted = true;
          const abortError = new Error("ABORT_EXPORT");
          csvStream.destroy(abortError);
          stream.destroy(abortError);
        }
      });

      try {
        await pipeline(stream, csvStream, writeStream);
      } catch (err) {
        if (err && err.message === "ABORT_EXPORT") {
          await queryRunner.release();
          return {
            data: "aborted",
            path: null,
            status: 400,
            message: `This export cannot proceed because it would result in a set of items larger than the imposed limit of ${this.MAX_API_DATA_LIMIT} items. Please restrict the data set further by adding filters.`,
          };
        } else {
          await queryRunner.release();
          throw err;
        }
      }

      if (rowCount === 0) {
        await queryRunner.release();
        return {
          data: "empty",
          path: null,
          status: 200,
          message: "No Data Found. Please adjust your search criteria.",
        };
      }

      await queryRunner.release();
      const ms = Date.now() - start;
      const min = Math.floor(ms / 60000);
      const sec = ((ms % 60000) / 1000).toFixed(1);

      this.logger.log(
        `prepareCsvExportData succeeded after ${min}m ${sec}s (${ms} ms)`,
      );
      this.logger.log("CSV file created at: " + filePath);

      return {
        data: stream,
        path: filePath,
        status: HttpStatus.OK,
        statistics: {
          recordCount: rowCount,
          uniqueLocations: uniqueLocations.size,
          minObservationDate,
          maxObservationDate,
        },
      };
    } catch (error) {
      this.logger.error(error);
      const ms = Date.now() - start;
      const min = Math.floor(ms / 60000);
      const sec = ((ms % 60000) / 1000).toFixed(1);
      this.logger.log(
        `prepareCsvExportData failed after ${min}m ${sec}s (${ms} ms)`,
      );
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: error?.message || "Failed to prepare CSV export data",
      });
    }
  }

  /**
   * Exports data from the database based on search criteria, enforcing record count limits and streaming to CSV if valid.
   * @param basicSearchDto - The search criteria DTO
   * @returns An object containing the export result, status, and message
   */
  public async exportDataFromDb(basicSearchDto: BasicSearchDto): Promise<any> {
    this.logger.log(
      "Exporting observations from DB with search criteria: " +
        JSON.stringify(basicSearchDto),
    );
    const start = Date.now();
    let result = null;

    const allEmpty = Object.values(basicSearchDto).every(
      (val) =>
        val === null ||
        val === undefined ||
        (typeof val === "string" && val.trim() === "") ||
        (Array.isArray(val) && val.length === 0),
    );

    if (allEmpty) {
      return {
        data: null,
        status: 400,
        message: "Please provide at least one search criteria.",
      };
    }

    try {
      this.logger.log("Fetching observations from DB...");
      this.logger.log(basicSearchDto);

      // Prepare temp file for streaming the API response
      const tempFileName = `tmp_obs_export_${Date.now()}.csv`;
      const tempFilePath = join(
        process.cwd(),
        `${this.DIR_NAME}${tempFileName}`,
      );

      result = await this.streamToCSV(basicSearchDto, tempFilePath);
      if (result.data == "aborted" || result.data == "empty") {
        fs.unlinkSync(tempFilePath);

        const elapsedMs = Date.now() - start;
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = ((elapsedMs % 60000) / 1000).toFixed(1);
        this.logger.debug(`AQI API took ${minutes}m ${seconds}s`);

        return {
          data: null,
          status: result.status,
          path: null,
          message: result.message,
        };
      }

      // const { whereSql, params } = await this.formulateSqlQuery(basicSearchDto);
      // const queryRunner = this.dataSource.createQueryRunner();
      // await queryRunner.connect();

      // const sql = `SELECT count(*) FROM aqi_csv_import_operational ${whereSql}`;

      // const observations = await queryRunner.query(sql, params);

      // await queryRunner.release();
      // this.logger.log(`Fetched ${observations[0].count} observations from DB`);

      // const count = parseInt(observations[0].count, 10);
      // if (count > this.MAX_API_DATA_LIMIT) {
      //   return {
      //     data: null,
      //     status: 400,
      //     path: null,
      //     message:
      //       "This export cannot proceed because it would result in a set of items larger than the imposed limit of 100000 items. Please restrict the data set further by adding filters.",
      //   };
      // } else if (count === 0) {
      //   return {
      //     data: null,
      //     status: 200,
      //     path: null,
      //     message: "No Data Found. Please adjust your search criteria.",
      //   };
      // } else {
      //   result = await this.streamToCSV(basicSearchDto, tempFilePath);
      // }

      const elapsedMs = Date.now() - start;
      const minutes = Math.floor(elapsedMs / 60000);
      const seconds = ((elapsedMs % 60000) / 1000).toFixed(1);
      this.logger.debug(`AQI API took ${minutes}m ${seconds}s`);

      return result;
    } catch (error) {
      this.logger.error(
        "Error fetching observations from DB: " + error.message,
      );
      return {
        data: null,
        status: 500,
        path: null,
        message: "Error fetching observations from DB.",
      };
    }
  }

  /**
   * Runs the export job for the given search criteria and job ID, updating job status and file path.
   * Also stores calculated statistics (record count, unique locations, date range).
   * @param basicSearchDto - The search criteria DTO
   * @param jobId - The job identifier
   */
  public async runExport(basicSearchDto: BasicSearchDto, jobId: string) {
    try {
      const result = await this.exportDataFromDb(basicSearchDto);
      if (result.data && result.path) {
        jobs[jobId].status = "complete";
        jobs[jobId].filePath = result.path;
        if (result.statistics) {
          jobs[jobId].statistics = result.statistics;
        }
      } else {
        jobs[jobId].status = "error";
        jobs[jobId].error = result.message || "Unknown error";
      }
    } catch (err) {
      jobs[jobId].status = "error";
      jobs[jobId].error = err?.message || "Unknown error";
    }
  }

  /**
   * Retrieves location names from the materialized view for dropdown compatibility.
   * @returns Array of location name objects
   */
  public async getLocationNames(): Promise<any[]> {
    this.logger.log(
      "getLocationNames called, querying materialized view mv_aqi_location_collection",
    );
    // Use TypeORM to query the materialized view entity and return raw data
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_location_collection",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiLocationCollection.location_name", "ASC")
      .getRawMany();

    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      id: item.MvAqiLocationCollection_location_id,
      name: item.MvAqiLocationCollection_location_name,
    }));
  }

  /**
   * Retrieves location types from the materialized view for dropdown compatibility.
   * @returns Array of location type objects
   */
  public async getLocationTypes(): Promise<any[]> {
    this.logger.log(
      "getLocationTypes called, querying materialized view mv_aqi_location_type",
    );
    // Use TypeORM to query the materialized view entity and return raw data
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_location_type",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiLocationType.location_type", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      customId: item.MvAqiLocationType_location_type,
    }));
  }

  /**
   * Retrieves location groups from the materialized view for dropdown compatibility.
   * @returns Array of location group objects
   */
  public async getLocationGroups(): Promise<any[]> {
    this.logger.log(
      "getLocationGroups called, querying materialized view mv_aqi_location_group",
    );
    // Use TypeORM to query the materialized view entity and return raw data
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_location_group",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiLocationGroup.location_group", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      name: item.MvAqiLocationGroup_location_group,
    }));
  }

  /**
   * Retrieves mediums from the materialized view for dropdown compatibility.
   * @returns Array of medium objects
   */
  public async getMediums(): Promise<any[]> {
    this.logger.log(
      "getMediums called, querying materialized view mv_aqi_mediums",
    );

    // Use TypeORM to query the materialized view entity and return raw data
    const repo =
      this["observationRepository"].manager.getRepository("mv_aqi_medium");
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiMedium.medium", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      customId: item.MvAqiMedium_medium,
    }));
  }

  /**
   * Retrieves observed property groups from the materialized view for dropdown compatibility.
   * @returns Array of observed property group objects
   */
  public async getObservedPropertyGroups(): Promise<any[]> {
    this.logger.log(
      "getObservedPropertyGroups called, querying materialized view mv_aqi_observed_property_description",
    );
    // Use TypeORM to query the materialized view entity and return raw data
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_observed_property_description",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy(
        "MvAqiObservedPropertyDescription.observed_property_description",
        "ASC",
      )
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      id: item.MvAqiObservedPropertyDescription_observed_property_description,
      name: item.MvAqiObservedPropertyDescription_observed_property_description,
    }));
  }

  /**
   * Retrieves projects from the materialized view for dropdown compatibility.
   * @returns Array of project objects
   */
  public async getProjects(): Promise<any[]> {
    this.logger.log(
      "getProjects called, querying materialized view mv_aqi_project",
    );
    // Use TypeORM to query the materialized view entity and return raw data
    const repo =
      this["observationRepository"].manager.getRepository("mv_aqi_project");
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiProject.project", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      id: item.MvAqiProject_project,
      customId: item.MvAqiProject_project_name,
    }));
  }

  /**
   * Retrieves analytical methods from the materialized view for dropdown compatibility.
   * @returns Array of analytical method objects
   */
  public async getAnalyticalMethods(): Promise<any[]> {
    this.logger.log(
      "getAnalyticalMethods called, querying materialized view mv_aqi_analysis_method_collection",
    );
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_analysis_method_collection",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiAnalysisMethodCollection.analysis_method", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      id: item.MvAqiAnalysisMethodCollection_analysis_method_id,
      name: item.MvAqiAnalysisMethodCollection_analysis_method,
    }));
  }

  /**
   * Retrieves analyzing agencies from the materialized view for dropdown compatibility.
   * @returns Array of analyzing agency objects
   */
  public async getAnalyzingAgencies(): Promise<any[]> {
    this.logger.log(
      "getAnalyzingAgencies called, querying materialized view mv_aqi_analyzing_agency",
    );
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_analyzing_agency",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiAnalyzingAgency.analyzing_agency_full_name", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      id: item.MvAqiAnalyzingAgency_analyzing_agency,
      name: item.MvAqiAnalyzingAgency_analyzing_agency_full_name,
    }));
  }

  /**
   * Retrieves observed properties from the materialized view for dropdown compatibility.
   * @returns Array of observed property objects
   */
  public async getObservedProperties(): Promise<any[]> {
    this.logger.log(
      "getObservedProperties called, querying materialized view mv_aqi_observed_property_id",
    );
    // Use TypeORM to query the materialized view entity and return raw data
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_observed_property_id",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiObservedPropertyId.observed_property_id", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      id: item.MvAqiObservedPropertyId_observed_property_id,
      customId: item.MvAqiObservedPropertyId_observed_property_id,
    }));
  }

  /**
   * Retrieves worked order numbers from the materialized view for dropdown compatibility.
   * @returns Array of worked order number objects
   */
  public async getWorkedOrderNos(): Promise<any[]> {
    this.logger.log(
      "getWorkedOrderNos called, querying materialized view mv_aqi_work_order_number",
    );
    // Use TypeORM to query the materialized view entity and return raw data
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_work_order_number",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiWorkOrderNumber.work_order_number", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      text: item.MvAqiWorkOrderNumber_work_order_number,
    }));
  }

  /**
   * Retrieves sampling agencies from the materialized view for dropdown compatibility.
   * @returns Array of sampling agency objects
   */
  public async getSamplingAgencies(): Promise<any[]> {
    this.logger.log(
      "getSamplingAgencies called, querying materialized view mv_aqi_sampling_agency",
    );
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_sampling_agency",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiSamplingAgency.sampling_agency", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      customId: item.MvAqiSamplingAgency_sampling_agency,
    }));
  }

  /**
   * Retrieves collection methods from the materialized view for dropdown compatibility.
   * @returns Array of collection method objects
   */
  public async getCollectionMethods(): Promise<any[]> {
    this.logger.log(
      "getCollectionMethods called, querying materialized view mv_aqi_collection_method",
    );
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_collection_method",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiCollectionMethod.collection_method", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      customId: item.MvAqiCollectionMethod_collection_method,
    }));
  }

  /**
   * Retrieves QC sample types from the materialized view for dropdown compatibility.
   * @returns Array of QC sample type objects
   */
  public async getQcSampleTypes(): Promise<any[]> {
    this.logger.log(
      "getQcSampleTypes called, querying materialized view mv_aqi_qc_type",
    );
    const repo =
      this["observationRepository"].manager.getRepository("mv_aqi_qc_type");
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiQcType.qc_type", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      qc_type: item.MvAqiQcType_qc_type,
    }));
  }

  /**
   * Retrieves data classifications from the materialized view for dropdown compatibility.
   * @returns Array of data classification objects
   */
  public async getDataClassifications(): Promise<any[]> {
    this.logger.log(
      "getDataClassifications called, querying materialized view mv_aqi_data_classification",
    );
    const repo = this["observationRepository"].manager.getRepository(
      "mv_aqi_data_classification",
    );
    const raw = await repo
      .createQueryBuilder()
      .select()
      .orderBy("MvAqiDataClassification.data_classification", "ASC")
      .getRawMany();
    // Return as array of objects for frontend dropdown compatibility
    return raw.map((item) => ({
      data_classification: item.MvAqiDataClassification_data_classification,
    }));
  }
}
