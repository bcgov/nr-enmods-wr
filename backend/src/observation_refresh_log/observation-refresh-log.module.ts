import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ObservationRefresh } from "./entities/observation-refresh-log.entity";
import { ObservationRefreshService } from "./observation-refresh-log.service";
import { ObservationRefreshController } from "./observation-refresh-log.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ObservationRefresh])],
  providers: [ObservationRefreshService],
  controllers: [ObservationRefreshController],
  exports: [ObservationRefreshService],
})
export class ObservationRefreshModule {}
