import { HttpService } from "@nestjs/axios";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
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
    const observationExportUrl =
      process.env.BASE_URL_BC_API + process.env.OBSERVATIONS_EXPORT_URL;

    const observationUrl =
      process.env.BASE_URL_BC_API + process.env.OBSERVATIONS_URL;

    const params = {
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

    const obsExportPromise = this.bcApiCall(observationExportUrl, params);
    const observationPromise = this.bcApiCall(observationUrl, params);
    const filePath = join(process.cwd(), "/data/tmp.csv");

    let status = await Promise.all([obsExportPromise, observationPromise]).then(
      (data: any[]) => {
        if (data.length > 0) {
          const obsExport = data[0]?.data;
          const observation =
            data[1] && JSON.parse(data[1].data)?.domainObjects;
          console.log(observation);
          if (obsExport && observation.length > 0) {
            return csv()
              .fromString(obsExport)
              .then((jsonObj: any[]) => {
                const obsExport = jsonObj.slice(0, 1000); // Get only 1000 records
                // console.log(obsExport);
                logger.log("Observation export length: " + obsExport.length);
                logger.log("Observation length: " + observation.length);

                const writeStream = createWriteStream(filePath);
                const csvStream = format({ headers: true });

                for (let i = 0; i < obsExport.length; i++) {
                  for (let j = 0; j < observation.length; j++) {
                    if (
                      observation[j].id ===
                      obsExport[i][ObsExportCsvHeader.ObservationId]
                    ) {
                      this.writeToCsv(observation[j], obsExport[i], csvStream);
                      break;
                    }
                  }
                }

                csvStream
                  .pipe(writeStream)
                  .on("error", (err) => console.error(err));
                writeStream.on("error", (err) => console.error(err));

                return "200";
              });
          }
          return "No Data Found";
        }

        return "400";
      }
    );
    return status;
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
      console.error(err);
    }
  }

  async getLocationTypes(): Promise<AxiosResponse<any>> {
    const url = `${process.env.BASE_URL_BC_API}${process.env.LOCATION_TYPE_CODE_TABLE_API}`;    
    return this.getDropdwnOptions(url, null, "customId");
  }

  getLocationNames(query: string): Promise<AxiosResponse<any>> {
    const url = `${process.env.BASE_URL_BC_API}${process.env.LOCATION_NAME_CODE_TABLE_API}`;
    const params = {
      limit: 100,
      search: query,
      sort: "asc",
    };
    return this.getDropdwnOptions(url, params, "name");
  }

  getPermitNumbers(query: string): Promise<AxiosResponse<any>> {
    const url = `${process.env.BASE_URL_BC_API}${process.env.PERMIT_NUMBER_CODE_TABLE_API}`;
    const params = {
      limit: 100,
      search: query,
    };
    return this.getDropdwnOptions(url, params, null);
  }

  getMediums(query: string): Promise<AxiosResponse<any>> {
    const url = `${process.env.BASE_URL_BC_API}${process.env.MEDIA_CODE_TABLE_API}`;
    const params = {
      limit: 100,
      search: query,
    };
    return this.getDropdwnOptions(url, params, null);
  }

  getObservedProperties(query: string): Promise<AxiosResponse<any>> {
    const url = `${process.env.BASE_URL_BC_API}${process.env.OBSERVED_PROPERTIES_CODE_TABLE_API}`;
    const params = {
      limit: 100,
      search: query,
    };
    return this.getDropdwnOptions(url, params, null);
  }

  getProjects(query: string): Promise<AxiosResponse<any>> {
    const url = `${process.env.BASE_URL_BC_API}${process.env.PROJECTS_CODE_TABLE_API}`;
    const params = {
      limit: 100,
      search: query,
    };
    return this.getDropdwnOptions(url, params, null);
  }
}
