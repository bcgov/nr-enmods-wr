import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
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

  @Post("observationSearch")
  public async basicSearch(@Res() response: Response, @Body() basicSearchDto: BasicSearchDto,
  ) {
    const jobId = uuidv4();
    jobs[jobId] = { id: jobId, status: "pending" };

    // Start background job (non-blocking)
    this.searchService.runExportJob(basicSearchDto, jobId);

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
  public getLocacationNames(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getLocationNames(query);
  }

  @Get("getPermitNumbers")
  public getPermitNumbers(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getPermitNumbers(query);
  }

  @Get("getProjects")
  public getProjects(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getProjects(query);
  }

  @Get("getMediums")
  public getMediums(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getMediums(query);
  }

  @Get("getObservedPropertyGroups")
  public getObservedPropertyGroups(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getObservedPropertyGroups(query);
  }

  @Get("getAnalyticalMethods")
  public getAnalyticalMethods(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getAnalyticalMethods(query);
  }

  @Get("getAnalyzingAgencies")
  public getAnalyzingAgencies(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getAnalyzingAgencies(query);
  }

  @Get("getObservedProperties")
  public getObservedProperties(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getObservedProperties(query);
  }

  @Get("getWorkedOrderNos")
  public getWorkedOrderNos(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getWorkedOrderNos(query);
  }

  @Get("getSamplingAgencies")
  public getSamplingAgencies(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getSamplingAgencies(query);
  }

  @Get("getCollectionMethods")
  public getCollectionMethods(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getCollectionMethods(query);
  }

  @Get("getUnits")
  public getUnits(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getUnits(query);
  }

  @Get("getQcSampleTypes")
  public getQcSampleTypes(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getQcSampleTypes(query);
  }

  @Get("getDataClassifications")
  public getDataClassifications(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getDataClassifications(query);
  }

  @Get("getSampleDepths")
  public getSampleDepths(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getSampleDepths(query);
  }

  @Get("getSpecimenIds")
  public getSpecimenIds(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getSpecimenIds(query);
  }
}
