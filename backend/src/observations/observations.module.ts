import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ObservationsService } from "./observations.service";
import { ObservationsController } from "./observations.controller";
import { Observation } from "./entities/observation.entity";
import { SearchModule } from "src/search/search.module";
import { ObservationRefreshModule } from "src/observation_refresh_log/observation-refresh-log.module"; // <-- Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([Observation]),
    SearchModule,
    ObservationRefreshModule,
  ],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
