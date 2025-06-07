import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { Response, Request } from "express";
import { BasicSearchDto } from "./dto/basicSearch.dto";
import { validateDto } from "src/validation/validateDto";
import { unlinkSync } from "fs";

@ApiTags("search")
@Controller({ path: "search", version: "1" })
export class SearchController {
  private readonly logger = new Logger("SearchController");
  constructor(private searchService: SearchService) {}

  @Post("observationSearch")
  @UsePipes(new ValidationPipe({ transform: true }))
  public async basicSearch(
    @Res() response: Response,
    @Body() basicSearchDto: BasicSearchDto,
  ) {
    try {
      validateDto(basicSearchDto);
      const res = await this.searchService.exportData(basicSearchDto);
      if (res.status === HttpStatus.OK) {
        response.status(HttpStatus.OK);
        if (res.data) this.sendCsvResponse(res.data, response);
        else response.send({ message: "No Data Found" });
      }
    } catch (error) {
      response.send(error.response);
    }
  }

  private sendCsvResponse(readStream: any, response: Response): void {
    readStream
      .on("open", () => {
        response.attachment("ObservationSearchResult.csv");
        readStream.pipe(response);
      })
      .on("close", () => {
        this.logger.log("Deleting tmp file: " + readStream.path);
        unlinkSync(readStream.path);
      });
  }

  @Get("getLocationTypes")
  public getLocationTypes() {
    console.log("getLocationTypes");
    return this.searchService.getLocationTypes();
  }

  @Get("getLocationNames")
  public getLocacationNames(@Req() req: Request) {
    const query: any = req.query.search;
    console.log("getLocationNames");
    return this.searchService.getLocationNames(query);
  }

  @Get("getPermitNumbers")
  public getPermitNumbers(@Req() req: Request) {
    console.log("getPermitNumbers");
    const query: any = req.query.search;
    return this.searchService.getPermitNumbers(query);
  }

  @Get("getProjects")
  public getProjects(@Req() req: Request) {
    console.log("getProjects");
    const query: any = req.query.search;
    return this.searchService.getProjects(query);
  }

  @Get("getMediums")
  public getMediums(@Req() req: Request) {
    console.log("getMediums");
    const query: any = req.query.search;
    return this.searchService.getMediums(query);
  }

  @Get("getObservedPropertyGroups")
  public getObservedPropertyGroups(@Req() req: Request) {
    console.log("gegetObservedPropertyGroupstMediums");
    const query: any = req.query.search;
    return this.searchService.getObservedPropertyGroups(query);
  }

  @Get("getAnalyticalMethods")
  public getAnalyticalMethods(@Req() req: Request) {
    console.log("getAnalyticalMethods");
    const query: any = req.query.search;
    return this.searchService.getAnalyticalMethods(query);
  }

  @Get("getAnalyzingAgencies")
  public getAnalyzingAgencies(@Req() req: Request) {
    console.log("getAnalyzingAgencies");
    const query: any = req.query.search;
    return this.searchService.getAnalyzingAgencies(query);
  }

  @Get("getObservedProperties")
  public getObservedProperties(@Req() req: Request) {
    console.log("getObservedProperties");
    const query: any = req.query.search;
    return this.searchService.getObservedProperties(query);
  }

  @Get("getWorkedOrderNos")
  public getWorkedOrderNos(@Req() req: Request) {
    console.log("getWorkedOrderNos");
    const query: any = req.query.search;
    return this.searchService.getWorkedOrderNos(query);
  }

  @Get("getSamplingAgencies")
  public getSamplingAgencies(@Req() req: Request) {
    console.log("getSamplingAgencies");
    const query: any = req.query.search;
    return this.searchService.getSamplingAgencies(query);
  }

  @Get("getCollectionMethods")
  public getCollectionMethods(@Req() req: Request) {
    console.log("getSampligetCollectionMethodsngAgencies");
    const query: any = req.query.search;
    return this.searchService.getCollectionMethods(query);
  }

  @Get("getUnits")
  public getUnits(@Req() req: Request) {
    console.log("getUnits");
    const query: any = req.query.search;
    return this.searchService.getUnits(query);
  }

  @Get("getQcSampleTypes")
  public getQcSampleTypes(@Req() req: Request) {
    console.log("getQcSampleTypes");
    const query: any = req.query.search;
    return this.searchService.getQcSampleTypes(query);
  }

  @Get("getDataClassifications")
  public getDataClassifications(@Req() req: Request) {
    console.log("getDataClassifications");
    const query: any = req.query.search;
    return this.searchService.getDataClassifications(query);
  }

  @Get("getSampleDepths")
  public getSampleDepths(@Req() req: Request) {
    console.log("getDataCgetSampleDepthslassifications");
    const query: any = req.query.search;
    return this.searchService.getSampleDepths(query);
  }

  @Get("getSpecimenIds")
  public getSpecimenIds(@Req() req: Request) {
    console.log("getDatgetSpecimenIdsaCgetSampleDepthslassifications");
    const query: any = req.query.search;
    return this.searchService.getSpecimenIds(query);
  }
}
