import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { BasicSearchDto } from "./dto/basicSearch.dto";
import { join } from "path";
import { sortArr } from "src/util/utility";
import { ObsExportCsvHeader } from "src/enum/obsExportCsvHeader.enum";
import * as fs from "fs";
import * as fastcsv from "@fast-csv/format";
import { parse } from "csv-parse";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Observation } from "../observations/entities/observation.entity";
import { Transform } from "stream";

import { promisify } from "util";
const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class SearchService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Observation)
    private readonly observationRepository: Repository<Observation>,
  ) {}
  private readonly logger = new Logger("ObservationSearchService");
  private readonly DIR_NAME = "/data/";
  private readonly MAX_DROPDWN_OPTIONS_LIMIT = 100;
  private readonly MAX_API_DATA_LIMIT = 1_000;
  private readonly OBSERVATIONS_URL = process.env.OBSERVATIONS_URL;
  private readonly OBSERVATIONS_EXPORT_URL =
    process.env.OBSERVATIONS_EXPORT_URL;

  /** exportData
   * Exports observations based on the provided search criteria.
   * It streams the AQS API response to a temporary file, processes it into CSV format,
   * and returns the CSV file as a stream.
   * In order to avoid memory issues, it processes the CSV in chunks.  CSV intermediary data from the OBSERVATIONS_EXPORT_URL AQS
   * API is streamed to a temporary file, which is then read and processed
   * to create a CSV file with the required headers and data.  This is done to avoid memory issues.
   * This is streamed back into memory, row by row, and compined with data from the database
   * to create the final CSV file.
   * @param basicSearchDto - The search criteria for filtering observations.
   * @returns A promise that resolves to the CSV file stream or a message if no data is found.
   */
  public async exportData(basicSearchDto: BasicSearchDto): Promise<any> {
    this.logger.debug(`Observations URL: ${this.OBSERVATIONS_URL}`);
    const start = Date.now();

    try {
      this.logger.debug(
        `Exporting observations with search criteria: ${JSON.stringify(
          basicSearchDto,
        )}`,
      );

      // Prepare temp file for streaming the API response
      const tempFileName = `tmp_obs_export_${Date.now()}.csv`;
      const tempFilePath = join(
        process.cwd(),
        `${this.DIR_NAME}${tempFileName}`,
      );

      // Get the API response as a stream
      const responseStream = await this.getObservationPromise(
        basicSearchDto,
        this.OBSERVATIONS_EXPORT_URL,
        "",
        true, // pass a flag to indicate streaming
      );

      if (!responseStream) {
        this.logger.debug("No observations found for export (empty stream)");
        return {
          data: null,
          status: 200,
          message: "No Data Found. Please adjust your search criteria.",
        };
      }

      // Pipe the response stream directly to a file and wait for completion
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempFilePath);
        responseStream.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
        responseStream.on("error", reject);
      });

      const elapsedMs = Date.now() - start;
      const minutes = Math.floor(elapsedMs / 60000);
      const seconds = ((elapsedMs % 60000) / 1000).toFixed(1);
      this.logger.debug(`AQI API took ${minutes}m ${seconds}s`);

      // Pass the temp file path to prepareCsvExportData
      const result = await this.prepareCsvExportData(tempFilePath);

      // Delete the temp file after processing
      await unlinkAsync(tempFilePath);

      return result;
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: err.response?.error || err.message || "Unknown error",
      });
    }
  }
  /**
   * Fetches observations from the API and returns a promise that resolves to the data.
   * If `asStream` is true, it returns a stream for direct processing.
   * Otherwise, it returns the full response data.
   */
  public async getObservationPromise(
    basicSearchDto: BasicSearchDto,
    url: string,
    cursor: string,
    asStream = false,
  ): Promise<any> {
    const params = this.getUserSearchParams(basicSearchDto, cursor);
    if (asStream) {
      // Use axiosRef directly for streaming
      const absoluteUrl = this.getAbsoluteUrl(url);

      const response = await this.httpService.axiosRef.get(absoluteUrl, {
        params,
        responseType: "stream",
      });
      return response.data; // This is the stream
    } else {
      // Default behavior (non-stream)
      return this.bcApiCall(this.getAbsoluteUrl(url), params);
    }
  }

  private async prepareCsvExportData(tempFilePath: string) {
    const start = Date.now();
    try {
      const fileName = `tmp${Date.now()}.csv`;
      const filePath = join(process.cwd(), `${this.DIR_NAME}${fileName}`);

      const csvStream = fastcsv.format({ headers: true });
      const writeStream = fs.createWriteStream(filePath);
      csvStream.pipe(writeStream).on("error", (err) => this.logger.error(err));

      // Stream from the temp file instead of a string
      const parser = parse({ columns: true, bom: true, trim: true });
      const readStream = fs.createReadStream(tempFilePath);
      readStream.pipe(parser);

      const memBeforeLoop = process.memoryUsage();
      const heapUsedMBBeforeLoop = memBeforeLoop.heapUsed / (1024 * 1024);
      this.logger.log(
        `[MEMORY USAGE BEFORE LOOP] heapUsed: ${heapUsedMBBeforeLoop.toFixed(2)} MB`,
      );
      let lastHeapUsedMB = heapUsedMBBeforeLoop;
      let processedRows = 0;
      let matchedRows = 0;

      for await (const row of parser) {
        const obsId = row[ObsExportCsvHeader.ObservationId];
        const memoryUsageBeforeCSVWrite =
          process.memoryUsage().heapUsed / (1024 * 1024);
        if (obsId) {
          const obsRecord = await this.observationRepository.findOneBy({
            id: obsId,
          });
          if (obsRecord) {
            this.writeToCsv(obsRecord.data, row, csvStream);
            matchedRows++;
          }
        }
        const memoryUsageAfterCSVWrite =
          process.memoryUsage().heapUsed / (1024 * 1024);
        processedRows++;
        const memNow = process.memoryUsage();
        const heapUsedNow = memNow.heapUsed / (1024 * 1024);
        if (heapUsedNow > 400 && lastHeapUsedMB <= 400) {
          this.logger.log(
            `[MEMORY CROSSED 400MB] at row: heapUsed: ${heapUsedNow.toFixed(2)} MB with obsId: ${obsId}`,
          );
          this.logger.log(
            `[MEMORY CROSSED 400MB] Memory usege before CSV write: ${memoryUsageBeforeCSVWrite.toFixed(2)} MB`,
          );
          this.logger.log(
            `[MEMORY CROSSED 400MB] Memory usege after CSV write: ${memoryUsageAfterCSVWrite.toFixed(2)} MB`,
          );
        }
        lastHeapUsedMB = heapUsedNow;
      }
      this.logger.log(
        `Finished processing CSV export, processed ${processedRows} rows.  Found ${matchedRows} matching observations.`,
      );
      csvStream.end();
      if (matchedRows === 0) {
        this.logger.debug(
          "No matching observations found, returning message instead of CSV.",
        );
        return {
          data: null,
          status: 200,
          message: "No Data Found. Please adjust your search criteria.",
        };
      }
      this.logger.log("CSV stream ended, waiting for writeStream to finish...");
      await new Promise((resolve, reject) => {
        readStream.on("end", resolve);
        writeStream.on("finish", resolve);
        readStream.on("close", resolve);
        readStream.on("error", reject);
      });
      // Now it's safe to delete
      await unlinkAsync(filePath);

      const ms = Date.now() - start;
      const min = Math.floor(ms / 60000);
      const sec = ((ms % 60000) / 1000).toFixed(1);
      this.logger.log(
        `prepareCsvExportData completed in ${min}m ${sec}s (${ms} ms)`,
      );
      return {
        data: fs.createReadStream(filePath),
        status: HttpStatus.OK,
      };
    } catch (err) {
      this.logger.error(err);
      const ms = Date.now() - start;
      const min = Math.floor(ms / 60000);
      const sec = ((ms % 60000) / 1000).toFixed(1);
      this.logger.log(
        `prepareCsvExportData failed after ${min}m ${sec}s (${ms} ms)`,
      );
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: err?.message || "Failed to prepare CSV export data",
      });
    }
  }

  private getUserSearchParams(basicSearchDto: BasicSearchDto, cursor: string) {
    let arr = [];

    if (basicSearchDto?.labBatchId) arr.push(basicSearchDto.labBatchId);

    if (basicSearchDto?.workedOrderNo)
      arr.push(basicSearchDto.workedOrderNo.text);

    if (
      basicSearchDto.samplingAgency &&
      basicSearchDto.samplingAgency.length > 0
    )
      arr.push(...basicSearchDto.samplingAgency);

    return {
      samplingLocationIds: (basicSearchDto.locationName || "").toString(),
      samplingLocationGroupIds: (basicSearchDto.permitNumber || "").toString(),
      media: (basicSearchDto.media || "").toString(),
      analyticalGroupIds: (basicSearchDto.observedPropertyGrp || "").toString(),
      projectIds: (basicSearchDto.projects || "").toString(),
      "start-observedTime": basicSearchDto.fromDate || "",
      "end-observedTime": basicSearchDto.toDate || "",
      limit: this.MAX_API_DATA_LIMIT,
      cursor: cursor,
      observedPropertyIds: (basicSearchDto?.observedProperty || "").toString(),
      labResultLaboratoryIds: (
        basicSearchDto?.analyzingAgency || ""
      ).toString(),
      analysisMethodIds: (basicSearchDto?.analyticalMethod || "").toString(),
      "start-resultTime": basicSearchDto?.labArrivalFromDate || "",
      "end-resultTime": basicSearchDto?.labArrivalToDate || "",
      collectionMethodIds: (basicSearchDto?.collectionMethod || "").toString(),
      qualityControlTypes: (basicSearchDto?.qcSampleType || "").toString(),
      dataClassifications: (
        basicSearchDto?.dataClassification || ""
      ).toString(),
      depthValue: basicSearchDto?.sampleDepth?.depth?.value
        ? parseFloat(basicSearchDto.sampleDepth.depth.value)
        : undefined,
      depthUnitId: basicSearchDto?.units?.id || "",
      specimenIds: (basicSearchDto?.specimenId || "").toString(),
      search: arr?.toString() || "",
    };
  }

  private async bcApiCall(url: string, params: any): Promise<any> {
    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: params,
        }),
      );
      if (res.status === HttpStatus.OK) return res;
    } catch (err) {
      if (err.response.data) {
        const errResponse = JSON.parse(err.response.data);
        let errMsg = [];
        errMsg.push(errResponse.message);
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          error: errMsg,
        });
      }
    }
  }

  private writeToCsv(observation: any, obsExport: any, csvStream: any) {
    const fieldVisit = observation?.fieldVisit;
    const specimen = observation?.specimen;
    const activity = observation?.activity;
    const numericResult = observation?.numericResult;

    csvStream.write({
      Ministry_Contact: this.getMinistryContact(fieldVisit?.extendedAttributes),
      Sampling_Agency: this.getSamplingAgency(fieldVisit?.extendedAttributes),
      Project: fieldVisit.project?.name,
      Work_Order_number: this.getWorkOrderNo(specimen?.extendedAttributes),
      Location_ID: obsExport[ObsExportCsvHeader.LocationId],
      Location_Name: fieldVisit.samplingLocation.name,
      LocationType: obsExport[ObsExportCsvHeader.LocationType],
      Location_Latitude: obsExport[ObsExportCsvHeader.Latitude],
      Location_Longitude: obsExport[ObsExportCsvHeader.Longitude],
      Location_Elevation: obsExport[ObsExportCsvHeader.Elevation],
      Location_Elevation_Units: obsExport[ObsExportCsvHeader.ElevationUnit],
      Location_Group: obsExport[ObsExportCsvHeader.LocationGroup],
      Field_Visit_Start_Time: fieldVisit.startTime,
      Field_Visit_End_Time: fieldVisit.endTime,
      Field_Visit_Participants: fieldVisit.participants,
      Field_Comment: obsExport[ObsExportCsvHeader.FieldComment],
      Activity_Comment: activity?.comment,
      Field_Filtered: specimen?.filtered,
      Field_Filtered_Comment: specimen?.filtrationComment,
      Field_Preservative: "",
      Field_Device_ID: obsExport[ObsExportCsvHeader.FieldDeviceId],
      Field_Device_Type: obsExport[ObsExportCsvHeader.FieldDeviceType],
      Sampling_Context_Tag: "",
      Collection_Method: obsExport[ObsExportCsvHeader.CollectionMethod],
      Medium: obsExport[ObsExportCsvHeader.Medium],
      Taxonomy: obsExport[ObsExportCsvHeader.Taxonomy],
      Depth_Upper: obsExport[ObsExportCsvHeader.DepthUpper],
      Depth_Lower: this.getDepthLower(activity?.extendedAttributes),
      Depth_Unit: obsExport[ObsExportCsvHeader.DepthUnit],
      Observed_Date_Time: obsExport[ObsExportCsvHeader.ObservedDateTime],
      Observed_Date_Time_End: activity?.endTime,
      Observed_Property_ID: obsExport[ObsExportCsvHeader.ObservedPropertyId],
      CAS_Number: obsExport[ObsExportCsvHeader.CasNumber],
      Result_Value: obsExport[ObsExportCsvHeader.ResultValue],
      Method_Detection_Limit:
        obsExport[ObsExportCsvHeader.MethodDetectionLimit],
      Method_Reporting_Limit: obsExport[ObsExportCsvHeader.MethodReportingUnit],
      Result_Unit: obsExport[ObsExportCsvHeader.ResultUnit],
      Detection_Condition: obsExport[ObsExportCsvHeader.DetectionCondition],
      Limit_Type: obsExport[ObsExportCsvHeader.LimitType],
      Composite_Stat: obsExport[ObsExportCsvHeader.CompositeStat],
      Fraction: numericResult?.sampleFraction,
      Data_Classification: obsExport[ObsExportCsvHeader.DataClassification],
      Analyzing_Agency: obsExport[ObsExportCsvHeader.AnalyzingAgency],
      Analysis_Method: obsExport[ObsExportCsvHeader.AnalysisMethod],
      Analyzed_Date_Time: obsExport[ObsExportCsvHeader.AnalyzedDateTime],
      Result_Status: obsExport[ObsExportCsvHeader.ResultStatus],
      Result_Grade: obsExport[ObsExportCsvHeader.ResultGrade],
      Activity_Name: obsExport[ObsExportCsvHeader.ActivityName],
      Tissue_Type: "",
      Lab_Arrival_Temperature: this.getLabArrivalTemp(
        specimen?.extendedAttributes,
      ),
      Specimen_Name: obsExport[ObsExportCsvHeader.SpecimenName],
      Lab_Quality_Flag: obsExport[ObsExportCsvHeader.LabQualityFlag],
      Lab_Arrival_Date_Time: obsExport[ObsExportCsvHeader.LabArrivalDateTime],
      Lab_Prepared_Date_Time: obsExport[ObsExportCsvHeader.LabPreparedDateTime],
      Lab_Sample_ID: obsExport[ObsExportCsvHeader.LabSampleId],
      Lab_Dilution_Factor: obsExport[ObsExportCsvHeader.LabDilutionFactor],
      Lab_Comment: obsExport[ObsExportCsvHeader.LabComment],
      Lab_Batch_ID: obsExport[ObsExportCsvHeader.LabBatchId],
      QC_Type: obsExport[ObsExportCsvHeader.QCType],
      QC_Source_Activity_Name:
        obsExport[ObsExportCsvHeader.QCSourceActivityName],
      Validation_Warnings: obsExport[ObsExportCsvHeader.ValidationWarnings],
      Standards_Violation: obsExport[ObsExportCsvHeader.StandardsViolation],
    });
  }

  private getDataFromObj(arr: any[], attr: string) {
    if (arr && arr.length > 0) {
      for (let i = 0; i < arr.length; i++) {
        if (Object.hasOwn(arr[i], attr)) {
          switch (attr) {
            case "text":
              return arr[i].text;
            case "number":
              return arr[i].number;
            case "dropDownListItem":
              return arr[i].dropDownListItem.customId;
            default:
              break;
          }
          break;
        }
      }
    }
    return;
  }

  private getDepthLower(arr: any[]) {
    return this.getDataFromObj(arr, "text");
  }

  private getLabArrivalTemp(arr: any[]) {
    return this.getDataFromObj(arr, "number");
  }

  private getSamplingAgency(arr: any[]) {
    return this.getDataFromObj(arr, "dropDownListItem");
  }

  private getMinistryContact(arr: any[]) {
    return this.getDataFromObj(arr, "text");
  }

  private getWorkOrderNo(arr: any[]) {
    return this.getDataFromObj(arr, "text");
  }

  private async getDropdwnOptionsFrmApi(
    url: string,
    query: string,
    sortBy: string | null,
    hasParams: any,
  ): Promise<any> {
    try {
      const params = {};
      if (hasParams) {
        params["limit"] = this.MAX_DROPDWN_OPTIONS_LIMIT;
        if (query) params["search"] = query;
      }

      const res = await firstValueFrom(
        this.httpService.get(url, { params: params }),
      );
      if (res.status === HttpStatus.OK) {
        const dataArr = JSON.parse(res.data).domainObjects;
        if (sortBy) sortArr(dataArr, sortBy);
        return dataArr;
      }
    } catch (err) {
      this.logger.error(
        `Error in getDropdwnOptionsFrmApi for url: ${url}, query: ${query}, sortBy: ${sortBy}, hasParams: ${hasParams}`,
      );
      this.logger.error("Exception:", err);
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: err.response || err.message || err,
      });
    }
  }

  private getAbsoluteUrl(relativeUrl: string) {
    return `${process.env.BASE_URL_BC_API}${relativeUrl}`;
  }

  public async getLocationTypes(): Promise<any[]> {
    this.logger.log(
      "getLocationTypes called, env:",
      process.env.LOCATION_TYPE_CODE_TABLE_API,
    );
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.LOCATION_TYPE_CODE_TABLE_API),
      null,
      "customId",
      false,
    );
  }

  public async getLocationNames(query: string): Promise<any[]> {
    this.logger.log(
      "getLocationNames called, env:",
      process.env.LOCATION_NAME_CODE_TABLE_API,
    );
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.LOCATION_NAME_CODE_TABLE_API),
      query,
      "name",
      true,
    );
  }

  public async getPermitNumbers(query: string): Promise<any[]> {
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.PERMIT_NUMBER_CODE_TABLE_API),
      query,
      null,
      true,
    );
  }

  public async getMediums(query: string): Promise<any[]> {
    const result = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.MEDIA_CODE_TABLE_API),
      query,
      null,
      true,
    );
    return result;
  }

  public async getObservedPropertyGroups(query: string): Promise<any[]> {
    const result = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.OBSERVED_PROPERTIES_GROUP_CODE_TABLE_API),
      query,
      null,
      true,
    );
    return result;
  }

  public async getProjects(query: string): Promise<any[]> {
    const result = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.PROJECTS_CODE_TABLE_API),
      query,
      null,
      true,
    );
    return result;
  }

  public async getAnalyticalMethods(query: string): Promise<any[]> {
    const result = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.ANALYTICAL_METHOD_CODE_TABLE_API),
      query,
      "name",
      true,
    );
    return result;
  }

  public async getAnalyzingAgencies(query: string): Promise<any[]> {
    const result = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.ANALYZING_AGENCY_CODE_TABLE_API),
      null,
      "name",
      false,
    );
    return result;
  }

  public async getObservedProperties(query: string): Promise<any[]> {
    const result = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.OBSERVED_PROPERTIES_CODE_TABLE_API),
      query,
      null,
      true,
    );
    return result;
  }

  public async getWorkedOrderNos(query: string): Promise<any[]> {
    const specimens = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.WORKED_ORDER_NO_CODE_TABLE_API),
      query,
      null,
      true,
    );
    const arr = this.getExtendedAttribute(specimens, "text");
    const workOrderedNos = [
      ...new Map(arr.map((item) => [item["text"], item])).values(),
    ];
    sortArr(workOrderedNos, "text");
    return workOrderedNos;
  }

  public async getSamplingAgencies(query: string): Promise<any[]> {
    const fieldVisits = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.SAMPLING_AGENCY_CODE_TABLE_API),
      query,
      null,
      true,
    );
    const arr = this.getExtendedAttribute(fieldVisits, "dropDownListItem");
    const agencies = [
      ...new Map(arr.map((item) => [item["id"], item])).values(),
    ];
    sortArr(agencies, "customId");
    return agencies;
  }

  private getExtendedAttribute(attributeArr: any[], name: string) {
    let arr = [];
    if (attributeArr && attributeArr.length > 0) {
      attributeArr.forEach((item: any) => {
        if (item.extendedAttributes && item.extendedAttributes.length > 0) {
          item.extendedAttributes.forEach((obj: any) => {
            if (Object.hasOwn(obj, name)) {
              arr.push(name === "text" ? obj : obj.dropDownListItem);
            }
          });
        }
      });
    }
    return arr;
  }

  public async getCollectionMethods(query: string): Promise<any[]> {
    const result = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.COLLECTION_METHOD_CODE_TABLE_API),
      null,
      null,
      false,
    );
    return result;
  }

  public async getUnits(query: string): Promise<any[]> {
    const result = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.UNITS_CODE_TABLE_API),
      null,
      "name",
      false,
    );
    return result;
  }

  public async getQcSampleTypes(query: string): Promise<any[]> {
    const activities = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.QC_SAMPLE_TYPE_CODE_TABLE_API),
      null,
      null,
      true,
    );
    const result = [
      ...new Map(activities.map((item: any) => [item["type"], item])).values(),
    ];
    return result;
  }

  public async getDataClassifications(query: string): Promise<any[]> {
    const observations = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.DATA_CLASSIFICATION_CODE_TABLE_API),
      query,
      null,
      true,
    );
    const result = [
      ...new Map(
        observations.map((item: any) => [item["dataClassification"], item]),
      ).values(),
    ];
    return result;
  }

  public async getSampleDepths(query: string): Promise<any[]> {
    const activities = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.SAMPLE_DEPTH_CODE_TABLE_API),
      null,
      null,
      true,
    );
    const obsArr = activities.filter((item: any) =>
      Object.hasOwn(item, "depth"),
    );
    const result = [
      ...new Map(
        obsArr.map((item: any) => [item["depth"].value, item]),
      ).values(),
    ].sort((a: any, b: any) => a.depth.value - b.depth.value);
    return result;
  }

  public async getSpecimenIds(query: string): Promise<any[]> {
    const specimens = await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.SPECIMEN_ID_CODE_TABLE_API),
      query,
      "name",
      true,
    );
    const result = [
      ...new Map(specimens.map((item: any) => [item["name"], item])).values(),
    ];
    return result;
  }
}
