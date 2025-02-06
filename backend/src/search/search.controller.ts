import {
  Body,
  Catch,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
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


const logger = new Logger("SearchController");

@ApiTags("search")
@Public() //TODO: secure endpoints
@Controller({ path: "search", version: "1" })
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Post("basicSearch")
  @UsePipes(new ValidationPipe({ transform: true }))
  public basicSearch(
    @Res() response: Response,
    @Body() basicSearchDto: BasicSearchDto
  ) {
    try {
      validateDto(basicSearchDto);
      this.searchService.exportData(basicSearchDto).then((res) => {
        if (res.status === HttpStatus.OK) {
          const contentDisposition = res.headers["content-disposition"];
          response
            .attachment(extractFileName(contentDisposition))
            .status(HttpStatus.OK)
            .send(res.data);
        }
      });
    } catch (error) {
      logger.log(error);
      response.send({ message: error.response });
    }
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

export const extractFileName = (contentDisposition: string): string => {
  const regex = /filename="?([^"]+)"?/;
  const match = contentDisposition ? contentDisposition.match(regex) : null;
  return match ? match[1] : "";
};
