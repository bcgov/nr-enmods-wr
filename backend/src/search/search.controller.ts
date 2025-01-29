import { Controller, Get, Req, Res } from "@nestjs/common";
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
  basicSearch(@Res() response: Response, @Req() request: Request) {
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
}

const extractFileName = (contentDisposition: string): string => {  
  const regex = /filename="?([^"]+)"?/;
  const match = contentDisposition ? contentDisposition.match(regex) : null;
  return match ? match[1] : null;
};
