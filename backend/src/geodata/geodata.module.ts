import { Module } from '@nestjs/common';
import { GeodataService } from './geodata.service';
import { GeodataController } from './geodata.controller';

@Module({
  controllers: [GeodataController],
  providers: [GeodataService],
})
export class GeodataModule {}
