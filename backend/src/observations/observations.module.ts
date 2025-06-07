import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ObservationsService } from "./observations.service";
import { ObservationsController } from "./observations.controller";
import { Observation } from "./entities/observation.entity";
import { SearchModule } from "src/search/search.module";

@Module({
  imports: [TypeOrmModule.forFeature([Observation]), SearchModule],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
