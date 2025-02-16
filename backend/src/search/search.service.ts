import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { BasicSearchDto } from "./dto/basicSearch.dto";
import { join } from "path";
import { format } from "@fast-csv/format";
import { createWriteStream } from "fs";
import { AxiosResponse } from "axios";
import { sortArr } from "src/util/utility";
import csv from "csvtojson";
import { ObsExportCsvHeader } from "src/enum/obsExportCsvHeader.enum";

const logger = new Logger("BasicSearchService");

@Injectable()
export class SearchService {
  constructor(private readonly httpService: HttpService) {}

  async exportData(basicSearchDto: BasicSearchDto): Promise<any> {
    try {
      const obsExportPromise = this.bcApiCall(
        this.getAbsoluteUrl(process.env.OBSERVATIONS_EXPORT_URL),
        this.getUserSearchParams(basicSearchDto)
      );
      const observationPromise = this.bcApiCall(
        this.getAbsoluteUrl(process.env.OBSERVATIONS_URL),
        this.getUserSearchParams(basicSearchDto)
      );

      const res = await Promise.all([obsExportPromise, observationPromise]);
      if (res.length > 0) {
        const obsExport = res[0]?.data;
        const observations = res[1] && JSON.parse(res[1].data)?.domainObjects;

        if (obsExport && observations.length > 0)
          return this.prepareCsvExportData(obsExport, observations);

        return { data: "", status: HttpStatus.OK };
      }
    } catch (err) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: err.response.error,
      });
    }
  }

  private async prepareCsvExportData(obsExport: string, observation: any[]) {
    try {
      const filePath = join(process.cwd(), "/data/tmp.csv");
      await csv()
        .fromString(obsExport)
        .then((jsonObj: any[]) => {
          const obsExport = jsonObj.slice(0, 1000);
          const writeStream = createWriteStream(filePath);
          const csvStream = format({ headers: true });

          for (let i = 0; i < obsExport.length; i++) {
            for (let j = 0; j < observation.length; j++) {
              const obsExportObservationId =
                obsExport[i][ObsExportCsvHeader.ObservationId];
              if (observation[j].id === obsExportObservationId) {
                this.writeToCsv(observation[j], obsExport[i], csvStream);
                break;
              }
            }
          }
         
          csvStream.pipe(writeStream).on("error", (err) => logger.log(err));
          writeStream.on("error", (err) => logger.log(err));
        });
      return { data: "success", status: HttpStatus.OK };
    } catch (err) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: err.response,
      });
    }
  }

  private getUserSearchParams(basicSearchDto: BasicSearchDto) {
    return {
      samplingLocationIds: this.getParamsIds(basicSearchDto, "locationName"),
      samplingLocationGroupIds: this.getParamsIds(
        basicSearchDto,
        "permitNumber"
      ),
      media: this.getParamsIds(basicSearchDto, "media"),
      observedPropertyIds: this.getParamsIds(
        basicSearchDto,
        "observedPropertyGrp"
      ),
      projectIds: this.getParamsIds(basicSearchDto, "projects"),
      limit: 1000,
    };
  }

  private async bcApiCall(url: string, params: any): Promise<any> {
    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: params,
        })
      );
      if (res.status === 200) return res;
    } catch (err) {
      logger.log(err);
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
      Project: fieldVisit.project.name,
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
        specimen?.extendedAttributes
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

  private getParamsIds(basicSearchDto: BasicSearchDto, attrName: string) {
    let ids = "";
    basicSearchDto[attrName].forEach((item: any) => {
      ids += item.id + ",";
    });
    return ids;
  }

  private async getDropdwnOptions(
    url: string,
    params: any,
    sortBy: string | null
  ): Promise<any> {
    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: params,
        })
      );
      if (res.status === 200) {
        const dataArr = JSON.parse(res.data).domainObjects;
        sortArr(dataArr, sortBy);
        return dataArr;
      }
    } catch (err) {
      logger.log(err);
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error: err.response,
      });
    }
  }

  private getAbsoluteUrl(relativeUrl: string) {
    return `${process.env.BASE_URL_BC_API}${relativeUrl}`;
  }

  getLocationTypes(): Promise<AxiosResponse<any>> {
    return this.getDropdwnOptions(
      this.getAbsoluteUrl(process.env.LOCATION_TYPE_CODE_TABLE_API),
      null,
      "customId"
    );
  }

  getLocationNames(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: 100,
      search: query,
      sort: "asc",
    };
    return this.getDropdwnOptions(
      this.getAbsoluteUrl(process.env.LOCATION_NAME_CODE_TABLE_API),
      params,
      "name"
    );
  }

  getPermitNumbers(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: 100,
      search: query,
    };
    return this.getDropdwnOptions(
      this.getAbsoluteUrl(process.env.PERMIT_NUMBER_CODE_TABLE_API),
      params,
      null
    );
  }

  getMediums(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: 100,
      search: query,
    };
    return this.getDropdwnOptions(
      this.getAbsoluteUrl(process.env.MEDIA_CODE_TABLE_API),
      params,
      null
    );
  }

  getObservedProperties(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: 100,
      search: query,
    };
    return this.getDropdwnOptions(
      this.getAbsoluteUrl(process.env.OBSERVED_PROPERTIES_CODE_TABLE_API),
      params,
      null
    );
  }

  getProjects(query: string): Promise<AxiosResponse<any>> {
    const params = {
      limit: 100,
      search: query,
    };
    return this.getDropdwnOptions(
      this.getAbsoluteUrl(process.env.PROJECTS_CODE_TABLE_API),
      params,
      null
    );
  }
}
