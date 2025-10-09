import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AqiCsvImportOperational } from './entities/aqi-csv-import-operational.entity';
import { AqiCsvImportOperationalService } from './aqi-csv-import-operational.service';
import { AqiCsvImportOperationalController } from './aqi-csv-import-operational.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AqiCsvImportOperational])],
  controllers: [AqiCsvImportOperationalController],
  providers: [AqiCsvImportOperationalService],
})
export class AqiCsvImportOperationalModule {}
