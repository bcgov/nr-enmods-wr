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
import { Public } from "src/auth/decorators/public.decorator";
import { SearchService } from "./search.service";
import { Response, Request } from "express";
import { BasicSearchDto } from "./dto/basicSearch.dto";
import { validateDto } from "src/validation/validateDto";
import { unlinkSync } from "fs";

@ApiTags("search")
@Public() //TODO: secure endpoints
@Controller({ path: "search", version: "1" })
export class SearchController {
  private readonly logger = new Logger("SearchController");
  constructor(private searchService: SearchService) {}

  @Post("basicSearch")
  @UsePipes(new ValidationPipe({ transform: true }))
  public async basicSearch(
    @Res() response: Response,
    @Body() basicSearchDto: BasicSearchDto
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
        response.attachment("BasicSearchResult.csv");
        readStream.pipe(response);
      })
      .on("close", () => {
        this.logger.log("Deleting tmp file: " + readStream.path);
        unlinkSync(readStream.path);
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

  @Get("getObservedProperties")
  public getObservedProperties(@Req() req: Request) {
    const query: any = req.query.search;
    return this.searchService.getObservedProperties(query);
  }
}
