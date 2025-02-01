import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/auth/decorators/public.decorator";
import { SearchService } from "./search.service";
import { Response, Request } from "express";

@ApiTags("search")
@Public()
@Controller({ path: "search", version: "1" })
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get("basicSearch")
  public basicSearch(@Res() response: Response, @Req() request: Request) {
    try {
      this.searchService.exportData(request).then((res) => {
        const contentDisposition = res.headers["content-disposition"];
        response.attachment(extractFileName(contentDisposition));
        response.send(res.data);
      });
    } catch (error) {
      console.error(error);
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

const extractFileName = (contentDisposition: string): string => {
  const regex = /filename="?([^"]+)"?/;
  const match = contentDisposition ? contentDisposition.match(regex) : null;
  return match ? match[1] : null;
};
