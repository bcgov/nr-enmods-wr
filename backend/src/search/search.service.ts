import { HttpService } from "@nestjs/axios";
import { BadRequestException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { BasicSearchDto } from "./dto/basicSearch.dto";
import { join } from "path";
import { AxiosResponse } from "axios";
import { sortArr } from "src/util/utility";
import csv from "csvtojson";
import { ObsExportCsvHeader } from "src/enum/obsExportCsvHeader.enum";
import * as fs from "fs";
import * as fastcsv from "@fast-csv/format";
import { parse } from "csv-parse";
import { rawListeners } from "process";

@Injectable()
export class SearchService {
  constructor(private readonly httpService: HttpService) {}
  private readonly logger = new Logger("BasicSearchService");
  private readonly DIR_NAME = "/data/";
  private readonly MAX_DROPDWN_OPTIONS_LIMIT = 100;
  private readonly MAX_API_DATA_LIMIT = 1_000;
  private readonly OBSERVATIONS_URL = process.env.OBSERVATIONS_URL;
  private readonly OBSERVATIONS_EXPORT_URL = process.env.OBSERVATIONS_EXPORT_URL;

  public async exportData(basicSearchDto: BasicSearchDto): Promise<any> {
    this.logger.debug(`Observations URL: ${this.OBSERVATIONS_URL}`);
    try {
      const obsExportPromise = this.getObservationPromise(basicSearchDto, this.OBSERVATIONS_EXPORT_URL, "");
      const observationPromise = this.getObservationPromise(basicSearchDto, this.OBSERVATIONS_URL, "");

      const res = await Promise.all([obsExportPromise, observationPromise]);

      if (res.length > 0) {
        const obsExport = res[0].data;
        const observations = await this.getObsFromPagination(JSON.parse(res[1].data), basicSearchDto);

        if (obsExport && observations.length > 0) return this.prepareCsvExportData(obsExport, observations);

        return { data: "", status: HttpStatus.OK };
      }
    } catch (err) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: err.response.error,
      });
    }
  }

  private getObservationPromise(basicSearchDto: BasicSearchDto, url: string, cursor: string): Promise<any> {
    return this.bcApiCall(this.getAbsoluteUrl(url), this.getUserSearchInputs(basicSearchDto, cursor));
  }

  private async getObsFromPagination(observations: any, basicSearchDto: BasicSearchDto): Promise<any> {
    const totalRecordCount = observations.totalCount;
    let currentObsData = observations.domainObjects;
    let cursor = observations.cursor;

    if (totalRecordCount > currentObsData.length && cursor) {
      const noOfLoop = Math.ceil(totalRecordCount / currentObsData.length);
      let i = 0;

      while (i < noOfLoop) {
        this.logger.log("Cursor for the next record: " + cursor);
        const res = await this.getObservationPromise(basicSearchDto, this.OBSERVATIONS_URL, cursor);
        if (res.status === HttpStatus.OK) {
          const data = JSON.parse(res.data);
          currentObsData = currentObsData.concat(data.domainObjects);
          cursor = data.cursor;
          i++;
        }
      }
    }

    return currentObsData;
  }

  private async prepareCsvExportData(obsExport: string, observations: any[]) {
    try {
      const fileName = `tmp${Date.now()}.csv`;
      const filePath = join(process.cwd(), `${this.DIR_NAME}${fileName}`);

      const observationMap = new Map<string, any>();
      for (const obs of observations) {
        observationMap.set(obs.id, obs);
      }

      const csvStream = fastcsv.format({ headers: true });
      const writeStream = fs.createWriteStream(filePath);

      csvStream.pipe(writeStream).on("error", (err) => this.logger.error(err));

      const parser = parse({ columns: true });
      parser.on("data", (row: any) => {
        const obsId = row[ObsExportCsvHeader.ObservationId];
        const matchingObs = observationMap.get(obsId);
        if (matchingObs) {
          this.writeToCsv(matchingObs, row, csvStream);
        }
      });

      parser.on("end", () => {
        csvStream.end();
      });

      parser.on("error", (err) => {
        this.logger.error("CSV parsing error:", err);
      });

      // Stream the original obsExport string into parser
      const exportStream = require("stream").Readable.from([obsExport]);
      exportStream.pipe(parser);

      return {
        data: fs.createReadStream(filePath),
        status: HttpStatus.OK,
      };
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: err?.message || "Failed to prepare CSV export data",
      });
    }
  }

  private getUserSearchInputs(basicSearchDto: BasicSearchDto, cursor: string) {
    return {
      samplingLocationIds: basicSearchDto.locationName.toString(),
      samplingLocationGroupIds: basicSearchDto.permitNumber.toString(),
      media: basicSearchDto.media.toString(),
      observedPropertyIds: basicSearchDto.observedPropertyGrp.toString(),
      projectIds: basicSearchDto.projects.toString(),
      "start-observedTime": basicSearchDto.fromDate,
      "end-observedTime": basicSearchDto.toDate,
      limit: this.MAX_API_DATA_LIMIT,
      cursor: cursor,
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
      this.logger.error(err);
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
      Field_Device_Type: [ObsExportCsvHeader.FieldDeviceType],
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
      Method_Detection_Limit: obsExport[ObsExportCsvHeader.MethodDetectionLimit],
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
      Lab_Arrival_Temperature: this.getLabArrivalTemp(specimen?.extendedAttributes),
      Specimen_Name: obsExport[ObsExportCsvHeader.SpecimenName],
      Lab_Quality_Flag: obsExport[ObsExportCsvHeader.LabQualityFlag],
      Lab_Arrival_Date_Time: obsExport[ObsExportCsvHeader.LabArrivalDateTime],
      Lab_Prepared_Date_Time: obsExport[ObsExportCsvHeader.LabPreparedDateTime],
      Lab_Sample_ID: obsExport[ObsExportCsvHeader.LabSampleId],
      Lab_Dilution_Factor: obsExport[ObsExportCsvHeader.LabDilutionFactor],
      Lab_Comment: obsExport[ObsExportCsvHeader.LabComment],
      Lab_Batch_ID: obsExport[ObsExportCsvHeader.LabBatchId],
      QC_Type: obsExport[ObsExportCsvHeader.QCType],
      QC_Source_Activity_Name: obsExport[ObsExportCsvHeader.QCSourceActivityName],
      Validation_Warnings: obsExport[ObsExportCsvHeader.ValidationWarnings],
      Standards_Violation: obsExport[ObsExportCsvHeader.StandardsViolation],
    });
  }

  private getDataFromObj(arr: any[], attr: string) {
    if (arr) {
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

  private async getDropdwnOptions(url: string, params: any, sortBy: string | null): Promise<any> {
    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: params,
        }),
      );
      if (res.status === HttpStatus.OK) {
        const dataArr = JSON.parse(res.data).domainObjects;
        sortArr(dataArr, sortBy);
        return dataArr;
      }
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: err.response,
      });
    }
  }

  private getAbsoluteUrl(relativeUrl: string) {
    return `${process.env.BASE_URL_BC_API}${relativeUrl}`;
  }

  public getLocationTypes(): Promise<AxiosResponse<any>> {
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.LOCATION_TYPE_CODE_TABLE_API), null, "customId");
  }

  public getLocationNames(query: string): Promise<AxiosResponse<any>> {
    console.log(query);
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
      sort: "asc",
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.LOCATION_NAME_CODE_TABLE_API), params, "name");
  }

  public getLocationGroups(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.LOCATION_GROUP_CODE_TABLE_API), params, "name");
  }

  public getPermitNumbers(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.PERMIT_NUMBER_CODE_TABLE_API), params, null);
  }

  public getMediums(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.MEDIA_CODE_TABLE_API), params, null);
  }

  public getObservedPropertyGroups(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.OBSERVED_PROPERTIES_GROUP_CODE_TABLE_API), params, null);
  }

  public getProjects(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.PROJECTS_CODE_TABLE_API), params, null);
  }

  public getAnalyticalMethods(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.ANALYTICAL_METHOD_CODE_TABLE_API), params, null);
  }

  public getAnalyzingAgencies(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.ANALYZING_AGENCY_CODE_TABLE_API), params, null);
  }

  public getObservedProperties(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.OBSERVED_PROPERTIES_CODE_TABLE_API), params, null);
  }

  public getWorkedOrderNos(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.WORKED_ORDER_NO_CODE_TABLE_API), params, null);
  }

  public getSamplingAgencies(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: this.MAX_DROPDWN_OPTIONS_LIMIT,
      search: query,
    };
    return this.getDropdwnOptions(this.getAbsoluteUrl(process.env.SAMPLING_AGENCY_CODE_TABLE_API), params, null);
  }


}
