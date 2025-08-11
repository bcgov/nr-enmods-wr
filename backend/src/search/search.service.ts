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
import { promisify } from "util";
import { jobs } from "src/jobs/searchjob";

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
  private readonly MAX_API_DATA_LIMIT = 10_000; 
  private readonly OBSERVATIONS_URL = process.env.OBSERVATIONS_URL;
  private readonly OBSERVATIONS_EXPORT_URL = process.env.OBSERVATIONS_EXPORT_URL;
  private readonly MAX_PARAMS_CHUNK = 55;

  /** Runs the export job in a thread so that it doesn't block the frontend */
  public async runExportJob(basicSearchDto: BasicSearchDto, jobId: string) {
    try {
      const result = await this.exportData(basicSearchDto);
      if (result.data && result.data.path) {
        jobs[jobId].status = "complete";
        jobs[jobId].filePath = result.data.path;
      } else {
        jobs[jobId].status = "error";
        jobs[jobId].error = result.message || "Unknown error";
      }

    } catch (err) {
      jobs[jobId].status = "error";
      jobs[jobId].error = err?.message || "Unknown error";
    }
  }

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
      this.logger.debug(
        `Exporting observations with search criteria: ${JSON.stringify(basicSearchDto)}`,
      );

      // check for errors in request to AQS API before streaming
      // this will throw an error if the request is invalid, e.g. too many results
      // or if the API is down, etc.  If we jump right to the streaming we may not see the errors
      // from the AQS API.  If there's an error, the exception handling will log it correctly
      // await this.getObservationPromise(
      //   basicSearchDto,
      //   this.OBSERVATIONS_EXPORT_URL,
      //   "",
      //   false, // don't stream, just check for errors
      // );
    

      // Prepare temp file for streaming the API response
      const tempFileName = `tmp_obs_export_${Date.now()}.csv`;
      const tempFilePath = join(process.cwd(), `${this.DIR_NAME}${tempFileName}`);
      
      if (basicSearchDto.locationType) {

        const obsIds = await this.getObsIdsFromLocationType(basicSearchDto);

        this.logger.log("Total observation to process: " + obsIds.length); 
        
        if (obsIds && obsIds.length > 0) { 

          if (obsIds.length > this.MAX_PARAMS_CHUNK) {
            const obsIdsPartition = this.partitionArray(obsIds, this.MAX_PARAMS_CHUNK);

            for (const ids of obsIdsPartition) {
              const params = { ...basicSearchDto, observationIds: ids };
              const responseStream = await this.getObservationPromise(params,
                this.OBSERVATIONS_EXPORT_URL,
                "",
                true,
              );
              const writeStream = fs.createWriteStream(tempFilePath, {flags: "a"});
              if (responseStream) {
                await new Promise((resolve, reject) => {
                  responseStream.pipe(writeStream);
                  writeStream.on("finish", resolve);
                  writeStream.on("error", reject);
                  responseStream.on("error", reject);
                });
              }
            }
          } else {
            const paramsDto = {
              ...basicSearchDto,
              observationIds: obsIds,
            };
            await this.prepareTempCsv(paramsDto, tempFilePath);
          }
        } else {
          this.logger.debug("No observations found for export (empty stream)");
          return {
            data: null,
            status: 200,
            message: "No Data Found. Please adjust your search criteria.",
          };
        }

      } else {
        await this.prepareTempCsv(basicSearchDto, tempFilePath);
      }

      const elapsedMs = Date.now() - start;
      const minutes = Math.floor(elapsedMs / 60000);
      const seconds = ((elapsedMs % 60000) / 1000).toFixed(1);
      this.logger.debug(`AQI API took ${minutes}m ${seconds}s`);

      // Pass the temp file path to prepareCsvExportData
      const result = await this.prepareCsvExportData(
        tempFilePath,
        basicSearchDto,
      );

      // Delete the temp file after processing
      await unlinkAsync(tempFilePath);

      return result;
    } catch (err) {
      this.logger.error(err);
      let apiMsg = Array.isArray(err.response?.error) && err.response?.error.length > 0
          ? err.response.error.join(" ")
          : err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Unknown error";

      // aqs no longer returns a message in the response, so if we get a 400 error, we return a generic message
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: apiMsg,
      });
    }
  }

  private async prepareTempCsv(basicSearchDto: BasicSearchDto, tempFilePath: string) {
    const responseStream = await this.getObservationPromise(basicSearchDto, this.OBSERVATIONS_EXPORT_URL, "", true);

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
  }

  /**
   * Fetches observations from the API and returns a promise that resolves to the data.
   * If `asStream` is true, it returns a stream for direct processing.
   * Otherwise, it returns the full response data.
   */
  public async getObservationPromise( basicSearchDto: BasicSearchDto, url: string, cursor: string, asStream = false): Promise<any> {
    const params = await this.getUserSearchParams(basicSearchDto, cursor);

    if (asStream) {
      // Use axiosRef directly for streaming
      const absoluteUrl = this.getAbsoluteUrl(url);

      const response = await this.httpService.axiosRef.get(absoluteUrl, {params, responseType: "stream"});
      return response.data; // This is the stream
    } else {
      // Default behavior (non-stream)
      return this.bcApiCall(this.getAbsoluteUrl(url), params);
    }
  }

  private partitionArray(arr: string[], size: number) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private async prepareCsvExportData(tempFilePath: string, basicSearchDto: BasicSearchDto) {
    const start = Date.now();
    try {
      const fileName = `tmp${Date.now()}.csv`;
      const filePath = join(process.cwd(), `${this.DIR_NAME}${fileName}`);

      const csvStream = fastcsv.format({ headers: true, writeBOM: true });
      const writeStream = fs.createWriteStream(filePath);

      // Add error and finish listeners for debugging
      csvStream.on("error", (err) =>
        this.logger.error("CSV Stream error: " + err.message),
      );
      writeStream.on("error", (err) =>
        this.logger.error("Write Stream error: " + err.message),
      );
      writeStream.on("finish", () => this.logger.log("Write stream finished"));
      csvStream.on("end", () => this.logger.log("CSV stream ended"));

      csvStream.pipe(writeStream);

      // Stream from the temp file instead of a string
      const parser = parse({ columns: true, bom: true, trim: true });
      const readStream = fs.createReadStream(tempFilePath);
      readStream.pipe(parser);

      let processedRows = 0;
      let matchedRows = 0;

      // batch processing of database requests
      const BATCH_SIZE = 1000;
      let batchRows = [];
      let batchIds = [];
      let isDataFound: boolean = false;

      try {
        for await (const row of parser) {
          const obsId = row[ObsExportCsvHeader.ObservationId];
          processedRows++;
          batchRows.push(row);
          batchIds.push(obsId);

          if (batchRows.length >= BATCH_SIZE) {
            // Fetch all records for this batch
            const obsRecords = await this.observationRepository.findBy({
              id: In(batchIds),
            });
            const obsMap = new Map(obsRecords.map((obs) => [obs.id, obs]));

            // Process the batch
            for (const row of batchRows) {
              const obsId = row[ObsExportCsvHeader.ObservationId];
              const obsRecord = obsMap.get(obsId);
              if (obsRecord) {
                matchedRows++;
                isDataFound = this.filterDataBeforeWriteToCsv(basicSearchDto, row, obsRecord, csvStream, isDataFound) 
              }
            }

            // Reset for next batch
            batchRows = [];
            batchIds = [];
          }
        }

        // Process any remaining rows
        if (batchRows.length > 0) {
          const obsRecords = await this.observationRepository.findBy({
            id: In(batchIds),
          });
          const obsMap = new Map(obsRecords.map((obs) => [obs.id, obs]));
          for (const row of batchRows) {
            const obsId = row[ObsExportCsvHeader.ObservationId];
            const obsRecord = obsMap.get(obsId);
            if (obsRecord) {
              matchedRows++;
              isDataFound = this.filterDataBeforeWriteToCsv(basicSearchDto, row, obsRecord, csvStream, isDataFound)            
            }
          }
        }

        if (basicSearchDto.locationType && !isDataFound) {
          return {
            data: null,
            status: 200,
            message: "No Data Found. Please adjust your search criteria.",
          };
        }
      } catch (err) {
        this.logger.error("Error during batch processing: " + err.message);
        throw err;
      } finally {
        csvStream.end();
      }

      this.logger.log(
        `Finished processing CSV export, processed ${processedRows} rows.  Found ${matchedRows} matching observations.`,
      );

      if (matchedRows === 0) {
        this.logger.debug(
          "No matching observations found, returning message instead of CSV.",
        );

        await unlinkAsync(filePath);

        return {
          data: null,
          status: 200,
          message: "No Data Found. Please adjust your search criteria.",
        };
      }

      this.logger.log("CSV stream ended, waiting for writeStream to finish...");
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      // Now it's safe to create the read stream and return it
      const reportReadStream = fs.createReadStream(filePath);

      const ms = Date.now() - start;
      const min = Math.floor(ms / 60000);
      const sec = ((ms % 60000) / 1000).toFixed(1);
      this.logger.log(
        `prepareCsvExportData completed in ${min}m ${sec}s (${ms} ms)`,
      );

      return {
        data: reportReadStream,
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

  private filterDataBeforeWriteToCsv(basicSearchDto: BasicSearchDto, row: any, obsRecord: Observation, csvStream: any, isDataFound: boolean): boolean {        
    if (basicSearchDto.locationType) {
      if (row[ObsExportCsvHeader.LocationType].trim() === basicSearchDto.locationType?.customId) {
        isDataFound = true;
        this.writeToCsv(obsRecord.data, row, csvStream);
      }
    } else {
      this.writeToCsv(obsRecord.data, row, csvStream);
    }

    return isDataFound;
  }
 
  private async getDataFromPagination(attribute: any, params: any, url: string): Promise<any[]> {
    const totalRecordCount = attribute.totalCount; 
    let currentObsData = attribute.domainObjects;
    let cursor = attribute.cursor;
    params = {...params, cursor: cursor };

    if (totalRecordCount > currentObsData.length && cursor) {
      const noOfLoop = Math.ceil(totalRecordCount / currentObsData.length);
      let i = 0; 

      while (i < noOfLoop) {
        this.logger.log("Cursor for the next record: " + cursor);
        const res = await this.bcApiCall(this.getAbsoluteUrl(url), params);
        
        if (res.status === HttpStatus.OK) {
          const data = JSON.parse(res.data);
          currentObsData = currentObsData.concat(data.domainObjects);
          cursor = data.cursor;
          params = { ...params, cursor: cursor };
          i++;
          if (currentObsData.length >= this.MAX_API_DATA_LIMIT) break; //Note: limit to Max. record
        }
      }
    }
    return currentObsData;
  }

  private async getObsIdsFromLocationType(basicSearchDto: BasicSearchDto): Promise<string[]> {

    let locationTypeIds: string[] = [];
    locationTypeIds.push(basicSearchDto.locationType?.id);

    const params = { locationTypeIds: locationTypeIds.toString(), limit: 1000 }; // max. limit of api is 1000

    const res = await this.bcApiCall(
      this.getAbsoluteUrl(process.env.LOCATION_NAME_CODE_TABLE_API),
      params,
    );

    if (res.status === HttpStatus.OK) {
      const locations = await this.getDataFromPagination(
        JSON.parse(res.data),
        params,
        process.env.LOCATION_NAME_CODE_TABLE_API,
      );
      
      this.logger.log("Total location from location type: " + locations.length);

      if (locations && locations.length > 0) {        
        const locationIds = locations.map((location) => location.id);        

        if (locationIds.length > this.MAX_PARAMS_CHUNK) {
          return await this.getObsIdFromLocationIdChunk(locationIds, basicSearchDto);         

        } else {
          const locationParam = {...basicSearchDto, locationName: locationIds};
          const params = await this.getUserSearchParams(locationParam, null);
          const res = await this.bcApiCall(this.getAbsoluteUrl(process.env.OBSERVATIONS_URL),
            params,
          );
          if (res.status === HttpStatus.OK) {
            const observations = await this.getDataFromPagination(
              JSON.parse(res.data),
              params,
              process.env.OBSERVATIONS_URL,
            );
            if (observations && observations.length > 0) {
              const obsIds = observations.map((item) => item.id);
              return obsIds;
            }
          }
        }      
      }
      return [];
    }
  }

  private async getObsIdFromLocationIdChunk(locationIds: string[], basicSearchDto: BasicSearchDto): Promise<string[]> {
    let obsIdsArr = [];
    const locationIdsPartition = this.partitionArray(locationIds, this.MAX_PARAMS_CHUNK);
    
    for (const ids of locationIdsPartition) {
      const locationParam = { ...basicSearchDto, locationName: ids };
      const params = await this.getUserSearchParams(locationParam, null);

      const res = await this.bcApiCall(this.getAbsoluteUrl(process.env.OBSERVATIONS_URL), params);

      if (res.status === HttpStatus.OK) {
        const observations = await this.getDataFromPagination(JSON.parse(res.data),
          params,
          process.env.OBSERVATIONS_URL,
        );

        this.logger.log("Observation length: " + observations.length);

        if (observations && observations.length > 0) {
          const obsIds = observations.map((item) => item.id);
          obsIdsArr = [...new Set([...obsIdsArr, ...obsIds])];      

          if(obsIdsArr.length >= this.MAX_API_DATA_LIMIT) break; //Note: limit to Max. record
        }
      }
    }
    
    return obsIdsArr.splice(0, this.MAX_API_DATA_LIMIT);  
  }

  private async getUserSearchParams(basicSearchDto: BasicSearchDto, cursor: string) {
    const queryParams = {
      samplingLocationIds: (basicSearchDto.locationName || "").toString(),
      samplingLocationGroupIds: (basicSearchDto.permitNumber || "").toString(),
      media: (basicSearchDto.media || "").toString(),
      analyticalGroupIds: (basicSearchDto.observedPropertyGrp || "").toString(),
      projectIds: (basicSearchDto.projects || "").toString(),
      "start-observedTime": basicSearchDto.fromDate ? new Date(basicSearchDto.fromDate) : "",
      "end-observedTime": basicSearchDto.toDate ? new Date(new Date(basicSearchDto.toDate).setHours(23,59,0,0)) : "",     
      limit: this.MAX_API_DATA_LIMIT,
      cursor: cursor,
      observedPropertyIds: (basicSearchDto?.observedProperty || "").toString(),
      labResultLaboratoryIds: (
        basicSearchDto?.analyzingAgency || ""
      ).toString(),
      analysisMethodIds: (basicSearchDto?.analyticalMethod || "").toString(),
      collectionMethodIds: (basicSearchDto?.collectionMethod || "").toString(),
      qualityControlTypes: (basicSearchDto?.qcSampleType || "").toString(),
      dataClassifications: (
        basicSearchDto?.dataClassification || ""
      ).toString(),
      depthValue: basicSearchDto?.sampleDepth ? parseFloat(basicSearchDto.sampleDepth)
        : undefined,
      specimenName: basicSearchDto?.specimenId,
    };

    if (basicSearchDto.observationIds && basicSearchDto.observationIds.length > 0)
      queryParams["ids"] = basicSearchDto?.observationIds.toString();

    if (basicSearchDto.labBatchId)
      queryParams["EA_Lab Batch ID"] = basicSearchDto?.labBatchId;

    if (basicSearchDto.workedOrderNo && basicSearchDto.workedOrderNo.text)
      queryParams["EA_Work Order Number"] =
        (basicSearchDto?.workedOrderNo.text).toString();

    if (basicSearchDto.samplingAgency && basicSearchDto.samplingAgency.length > 0)
      queryParams["EA_Sampling Agency"] = (basicSearchDto?.samplingAgency).toString();

    return queryParams;
  }

  private async bcApiCall(url: string, params: any): Promise<any> {
    try {

      const res = await firstValueFrom(this.httpService.get(url, { params: params}));
      if (res.status === HttpStatus.OK) return res;

    } catch (err) {
      this.logger.log(err);
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
      Location_Name: fieldVisit.samplingLocation?.name,
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
    hasParams: boolean,
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
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.MEDIA_CODE_TABLE_API),
      query,
      null,
      true,
    );    
  }

  public async getObservedPropertyGroups(query: string): Promise<any[]> {
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.OBSERVED_PROPERTIES_GROUP_CODE_TABLE_API),
      query,
      null,
      true,
    );    
  }

  public async getProjects(query: string): Promise<any[]> {
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.PROJECTS_CODE_TABLE_API),
      query,
      null,
      true,
    );    
  }

  public async getAnalyticalMethods(query: string): Promise<any[]> {
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.ANALYTICAL_METHOD_CODE_TABLE_API),
      query,
      "name",
      true,
    );    
  }

  public async getAnalyzingAgencies(query: string): Promise<any[]> {
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.ANALYZING_AGENCY_CODE_TABLE_API),
      null,
      "name",
      false,
    );    
  }

  public async getObservedProperties(query: string): Promise<any[]> {
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.OBSERVED_PROPERTIES_CODE_TABLE_API),
      query,
      null,
      true,
    );    
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
      ...new Map(arr.map((item) => [item["id"], item])).values(),
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
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.COLLECTION_METHOD_CODE_TABLE_API),
      null,
      null,
      false,
    );    
  }

  public async getUnits(query: string): Promise<any[]> {
    return await this.getDropdwnOptionsFrmApi(
      this.getAbsoluteUrl(process.env.UNITS_CODE_TABLE_API),
      null,
      "name",
      false,
    );    
  }

  public async getQcSampleTypes(query: string): Promise<any[]> {
    const qcTypes = await this.observationRepository.query(`SELECT distinct data->>'qualityControlType' qc_type
                    FROM public.observations where data->>'qualityControlType' is not null`);
    
    if (qcTypes && qcTypes.length > 0) 
      return qcTypes
    
    return [];

  }

  public async getDataClassifications(query: string): Promise<any[]> {
    const dataClassifications = await this.observationRepository.query(`SELECT distinct data->>'dataClassification' data_classification
      FROM public.observations where data->>'dataClassification' is not null`);

    if (dataClassifications && dataClassifications.length > 0) 
    return dataClassifications

    return [];
  }

  // public async getSampleDepths(query: string): Promise<any[]> {
  //   const activities = await this.getDropdwnOptionsFrmApi(
  //     this.getAbsoluteUrl(process.env.SAMPLE_DEPTH_CODE_TABLE_API),
  //     null,
  //     null,
  //     true,
  //   );
  //   const data = activities.domainObjects;
  //   const obsArr = data.filter((item: any) =>
  //     Object.hasOwn(item, "depth"),
  //   );
  //   const result = [
  //     ...new Map(
  //       obsArr.map((item: any) => [item["depth"].value, item]),
  //     ).values(),
  //   ].sort((a: any, b: any) => a.depth.value - b.depth.value);
  //   return result;
  // }

  // public async getSpecimenIds(query: string): Promise<any[]> {
  //   const specimens = await this.getDropdwnOptionsFrmApi(
  //     this.getAbsoluteUrl(process.env.SPECIMEN_ID_CODE_TABLE_API),
  //     query,
  //     "name",
  //     true,
  //   );
  //   const data = specimens.domainObjects;
  //   return [
  //     ...new Map(data.map((item: any) => [item["name"], item])).values(),
  //   ];
  // }
}

