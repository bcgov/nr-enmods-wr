import { Module } from "@nestjs/common";
import { GeodataService } from "./geodata.service";
import { GeodataController } from "./geodata.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FileInfo } from "./entities/file-info.entity";

@Module({
  imports: [TypeOrmModule.forFeature([FileInfo])],
  controllers: [GeodataController],
  providers: [GeodataService],
})
export class GeodataModule {}
