import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { Response, Request } from "express";
import { BasicSearchDto } from "./dto/basicSearch.dto";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { jobs } from "src/jobs/searchjob";

@ApiTags("search")
@Controller({ path: "search", version: "1" })
export class SearchController {
  private readonly logger = new Logger("SearchController");
  constructor(private searchService: SearchService) {}

  @Get("downloadReport")
  public async search(@Res() response: Response, @Query() query: Record<string,any>) {  
    
    const queryParams=  JSON.parse(JSON.stringify(query));
    let params: BasicSearchDto = {
      locationType: queryParams.locationType ? {id: queryParams.locationType, customId: queryParams.locationTypeCustomId} : '',
      locationName: queryParams.locationName ? queryParams.locationName : '',
      permitNumber: queryParams.permitNumber ? queryParams.permitNumber : '',
      fromDate: queryParams.fromDate ? queryParams.fromDate : '',
      toDate: queryParams.toDate ? queryParams.toDate : '',
      media: queryParams.media ? queryParams.media : '',
      observedPropertyGrp: queryParams.observedPropertyGrp ? queryParams.observedPropertyGrp : '',
      observedProperty: queryParams.observedProperty ? queryParams.observedProperty : '',
      projects: queryParams.projects ? queryParams.projects : '',
      workedOrderNo: queryParams.workedOrderNo ? {id: queryParams.workedOrderNo, text: queryParams.workOrderNoText} : '',
      samplingAgency: queryParams.samplingAgency ? queryParams.samplingAgency : '',
      analyzingAgency: queryParams.analyzingAgency ? queryParams.analyzingAgency : '',
      analyticalMethod: queryParams.analyticalMethod ? queryParams.analyticalMethod : '',
      collectionMethod: queryParams.collectionMethod ? queryParams.collectionMethod : '',
      qcSampleType: queryParams.qcSampleType ? queryParams.qcSampleType : '',
      dataClassification: queryParams.data_classification ? queryParams.data_classification : '',
      sampleDepth: queryParams.sampleDepth ? queryParams.sampleDepth : '',
      labBatchId: queryParams.labBatchId ? queryParams.labBatchId : '',
      specimenId: queryParams.specimenId ? queryParams.specimenId : '',
      fileFormat: ''
    }

    const jobId = uuidv4();
    jobs[jobId] = { id: jobId, status: "pending" };

    await this.searchService.runExportJob(params, jobId);
  
    const job = jobs[jobId];
    if (!job || job.status !== "complete" || !job.filePath) {
      return response.status(404).json({ message: job.error });
    }
    response.attachment("ObservationSearchResult.csv");
    const stream = fs.createReadStream(job.filePath);
    stream.pipe(response);
    stream.on("close", () => {
      fs.unlinkSync(job.filePath);
      delete jobs[jobId];
    });
    stream.on("error", () => {
      response.status(500).send("Failed to stream file.");
      delete jobs[jobId];
    });

  }

  @Post("observationSearch")
  public async basicSearch(@Res() response: Response, @Body() basicSearchDto: BasicSearchDto) {
    const jobId = uuidv4();
    jobs[jobId] = { id: jobId, status: "pending" };

    // Start background job (non-blocking)
    // this.searchService.runExportJob(basicSearchDto, jobId);

    this.searchService.runExport(basicSearchDto, jobId);

    response.status(202).json({ jobId });
  }

  @Get("observationSearch/status/:jobId")
  public getJobStatus(@Param("jobId") jobId: string, @Res() response: Response) {
    const job = jobs[jobId];
    if (!job) return response.status(404).json({ status: "not_found" });
    response.json({ status: job.status, error: job.error });
  }

  @Get("observationSearch/download/:jobId")
  public downloadResult(@Param("jobId") jobId: string, @Res() response: Response) {
    const job = jobs[jobId];
    if (!job || job.status !== "complete" || !job.filePath) {
      return response.status(404).json({ message: "File not ready" });
    }
    response.attachment("ObservationSearchResult.csv");
    const stream = fs.createReadStream(job.filePath);
    stream.pipe(response);
    stream.on("close", () => {
      fs.unlinkSync(job.filePath);
      delete jobs[jobId];
    });
    stream.on("error", () => {
      response.status(500).send("Failed to stream file.");
      delete jobs[jobId];
    });
  }

  @Get("getLocationTypes")
  public getLocationTypes() {
    return this.searchService.getLocationTypes();
  }

  @Get("getLocationNames")
  public getLocationNames() {
    return this.searchService.getLocationNames();
  }

  @Get("getLocationGroups")
  public getLocationGroups(@Req() req: Request) {
    return this.searchService.getLocationGroups();
  }

  @Get("getProjects")
  public getProjects() {
    return this.searchService.getProjects();
  }

  @Get("getMediums")
  public getMediums() {
    return this.searchService.getMediums();
  }

  @Get("getObservedPropertyGroups")
  public getObservedPropertyGroups() {
    return this.searchService.getObservedPropertyGroups();
  }

  @Get("getAnalyticalMethods")
  public getAnalyticalMethods() {
    return this.searchService.getAnalyticalMethods();
  }

  @Get("getAnalyzingAgencies")
  public getAnalyzingAgencies() {
    return this.searchService.getAnalyzingAgencies();
  }

  @Get("getObservedProperties")
  public getObservedProperties() {
    return this.searchService.getObservedProperties();
  }

  @Get("getWorkedOrderNos")
  public getWorkedOrderNos() {
    return this.searchService.getWorkedOrderNos();
  }

  @Get("getSamplingAgencies")
  public getSamplingAgencies() {
    return this.searchService.getSamplingAgencies();
  }

  @Get("getCollectionMethods")
  public getCollectionMethods() {
    return this.searchService.getCollectionMethods();
  }

  @Get("getUnits")
  public getUnits(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getUnits(query);
  }

  @Get("getQcSampleTypes")
  public getQcSampleTypes() {
    return this.searchService.getQcSampleTypes();
  }

  @Get("getDataClassifications")
  public getDataClassifications() {
    return this.searchService.getDataClassifications();
  }

  // @Get("getSampleDepths")
  // public getSampleDepths(@Req() req: Request) {
  //   const query: any = req.query.search;
  //   return this.searchService.getSampleDepths(query);
  // }

  // @Get("getSpecimenIds")
  // public getSpecimenIds(@Req() req: Request) {
  //   const query: any = req.query.search;
  //   return this.searchService.getSpecimenIds(query);
  // }
}
