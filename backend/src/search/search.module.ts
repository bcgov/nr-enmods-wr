import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Observation } from "../observations/entities/observation.entity";
import { AqiCsvImportOperational } from "../aqi-csv-import-operational/entities/aqi-csv-import-operational.entity";

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
      },
    }),
  TypeOrmModule.forFeature([Observation, AqiCsvImportOperational]),
  ],
  exports: [SearchService],
})
export class SearchModule {}
