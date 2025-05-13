import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { HttpModule } from "@nestjs/axios";

@Module({
  controllers: [SearchController],
  providers: [SearchService],
  imports: [
    HttpModule.register({
      responseType: "blob" as "blob",
      withCredentials: true,      
      headers: {        
        Authorization: "token " + process.env.AUTH_TOKEN,
        "x-api-key": process.env.API_KEY,
      }      
    }),
  ],
})
export class SearchModule {}
