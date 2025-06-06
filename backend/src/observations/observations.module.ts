import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ObservationsService } from "./observations.service";
import { ObservationsController } from "./observations.controller";
import { Observation } from "./entities/observation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Observation])],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule implements OnModuleInit {
  constructor(private readonly observationsService: ObservationsService) {}

  async onModuleInit() {
    // Populate the observations table on startup
    await this.observationsService.refreshObservationsTable();
  }
}
