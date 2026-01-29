import {
  Body,
  Controller,
  Delete,
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

  /**
   * Converts query string parameters to the format expected by the search service.
   * Query strings from URLs come in as single strings, but need to be converted to arrays
   * for fields that use ANY() in SQL (media, observedProperty, etc.)
   */
  private normalizeQueryParameters(
    queryParams: Record<string, any>,
  ): BasicSearchDto {
    // Array fields that should be split on commas if they come as strings
    const arrayFields = [
      "locationName",
      "permitNumber",
      "media",
      "observedProperty",
      "projects",
      "samplingAgency",
      "analyzingAgency",
      "analyticalMethod",
      "collectionMethod",
      "qcSampleType",
      "dataClassification",
      "workedOrderNo",
    ];

    const normalized: any = {};

    for (const [key, value] of Object.entries(queryParams)) {
      if (arrayFields.includes(key)) {
        // Convert string to array
        if (typeof value === "string" && value) {
          normalized[key] = [value];
        } else if (Array.isArray(value)) {
          normalized[key] = value;
        } else {
          normalized[key] = "";
        }
      } else if (key === "workOrderNoText") {
        // Handle workOrderNoText from URL and convert to workedOrderNo format
        if (typeof value === "string" && value) {
          normalized["workedOrderNo"] = [{ text: value }];
        } else {
          normalized["workedOrderNo"] = "";
        }
      } else if (key === "locationType") {
        // Special handling for locationType which is an object
        normalized[key] = queryParams.locationType
          ? {
              id: queryParams.locationType,
              customId: queryParams.locationTypeCustomId,
            }
          : "";
      } else if (key === "locationTypeCustomId") {
        // Handle locationTypeCustomId - if locationType wasn't set, try to use just customId
        if (!queryParams.locationType && queryParams.locationTypeCustomId) {
          normalized["locationType"] = {
            id: queryParams.locationTypeCustomId,
            customId: queryParams.locationTypeCustomId,
          };
        }
        // Otherwise skip it as it was already processed with locationType above
      } else {
        // Copy other fields as-is
        normalized[key] = value || "";
      }
    }

    return normalized as BasicSearchDto;
  }

  @Get("downloadReport")
  public async search(
    @Res() response: Response,
    @Query() query: Record<string, any>,
  ) {
    const queryParams = JSON.parse(JSON.stringify(query));
    const params = this.normalizeQueryParameters(queryParams);

    const jobId = uuidv4();
    jobs[jobId] = { id: jobId, status: "pending" };

    // Start background job (non-blocking)
    this.searchService.runExport(params, jobId);

    // Return a redirect to a polling endpoint that will redirect to download when ready
    response.redirect(`/api/v1/search/observationSearch/get/${jobId}`);
  }

  /**
   * GET endpoint for browser-friendly CSV download
   * Users can paste the URL directly in browser and get automatic download
   * Usage: /api/v1/search/observationSearch/get?param1=value1&param2=value2...
   */
  @Get("observationSearch/get/:jobId")
  public async getBrowserFriendlyDownload(
    @Param("jobId") jobId: string,
    @Res() response: Response,
  ) {
    const job = jobs[jobId];

    if (!job) {
      return response.status(404).json({ message: "Job not found" });
    }

    // If job failed, show error immediately
    if (job.status === "error" || job.error) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error</title>
          </head>
          <body>
            <h2>Error</h2>
            <p>${job.error || "An error occurred while processing your request"}</p>
          </body>
        </html>
      `;
      response.setHeader("Content-Type", "text/html");
      return response.status(500).send(html);
    }

    // If job is still pending, return polling page with auto-refresh
    if (job.status === "pending") {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Downloading...</title>
            <meta http-equiv="refresh" content="2">
          </head>
          <body>
            <p>Your file is being prepared. Please wait...</p>
          </body>
        </html>
      `;
      response.setHeader("Content-Type", "text/html");
      return response.send(html);
    }

    // If job is complete, show download link
    if (job.status === "complete" && job.filePath) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Download Ready</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
              }
              .success-box {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 4px;
                padding: 20px;
                margin: 20px 0;
              }
              .download-link {
                display: inline-block;
                background-color: #007bff;
                color: white;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 4px;
                margin: 10px 0;
              }
              .download-link:hover {
                background-color: #0056b3;
              }
            </style>
          </head>
          <body>
            <div class="success-box">
              <h2>✓ Your file is ready!</h2>
              <p>Click the button below to download your CSV file:</p>
              <a href="/api/v1/search/observationSearch/download/${jobId}" class="download-link">
                Download ObservationSearchResult.csv
              </a>
            </div>
          </body>
        </html>
      `;
      response.setHeader("Content-Type", "text/html");
      return response.send(html);
    }

    // Unexpected status
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unknown Status</title>
        </head>
        <body>
          <p>Unknown job status. Please try again.</p>
        </body>
      </html>
    `;
    response.setHeader("Content-Type", "text/html");
    response.status(400).send(html);
  }

  @Post("observationSearch")
  public async basicSearch(
    @Res() response: Response,
    @Body() basicSearchDto: BasicSearchDto,
  ) {
    const jobId = uuidv4();
    jobs[jobId] = { id: jobId, status: "pending" };

    // Start background job (non-blocking)
    // this.searchService.runExportJob(basicSearchDto, jobId);

    this.searchService.runExport(basicSearchDto, jobId);

    response.status(202).json({ jobId });
  }

  @Get("observationSearch/status/:jobId")
  public getJobStatus(
    @Param("jobId") jobId: string,
    @Res() response: Response,
  ) {
    const job = jobs[jobId];
    if (!job) return response.status(404).json({ status: "not_found" });
    const statusData: any = { status: job.status };
    if (job.error) statusData.error = job.error;
    if (job.statistics) statusData.statistics = job.statistics;
    response.json(statusData);
  }

  @Get("observationSearch/download/:jobId")
  public downloadResult(
    @Param("jobId") jobId: string,
    @Res() response: Response,
  ) {
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

  @Delete("observationSearch/job/:jobId")
  public deleteJob(@Param("jobId") jobId: string, @Res() response: Response) {
    const job = jobs[jobId];
    if (!job) {
      return response.status(404).json({ message: "Job not found" });
    }

    // Delete the CSV file if it exists
    if (job.filePath) {
      try {
        fs.unlinkSync(job.filePath);
        this.logger.log(`Deleted file: ${job.filePath}`);
      } catch (err) {
        this.logger.error(`Error deleting file ${job.filePath}:`, err);
      }
    }

    // Delete the job from memory
    delete jobs[jobId];
    response.json({ message: "Job deleted successfully" });
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

  @Get("getQcSampleTypes")
  public getQcSampleTypes() {
    return this.searchService.getQcSampleTypes();
  }

  @Get("getDataClassifications")
  public getDataClassifications() {
    return this.searchService.getDataClassifications();
  }
}
