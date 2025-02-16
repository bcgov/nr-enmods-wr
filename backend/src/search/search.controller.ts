import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  NotFoundException,
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
import { createReadStream } from "fs";
import { join } from "path";

const logger = new Logger("SearchController");

@ApiTags("search")
@Public() //TODO: secure endpoints
@Controller({ path: "search", version: "1" })
export class SearchController {
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
      if (res.status === 200) {
        response.status(HttpStatus.OK);
        if (res.data) this.sendCsvAsResponse(response);
        else response.send({ message: "No Data Found" });
      }
    } catch (error) {
      response.send(error.response);
    }
  }

  private sendCsvAsResponse(response: Response): void {
    const readStream = createReadStream(join(process.cwd(), "/data/tmp.csv"));
    response.attachment("BasicSearchResult.csv");
    readStream
      .on("open", () => {             
        readStream.pipe(response);
      })
      .on("error", (err) => {
        throw new NotFoundException({
          status: HttpStatus.NOT_FOUND,
          error: err,
        });
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
