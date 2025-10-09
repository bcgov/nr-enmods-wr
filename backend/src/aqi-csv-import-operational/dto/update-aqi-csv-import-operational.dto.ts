import { PartialType } from '@nestjs/mapped-types';
import { CreateAqiCsvImportOperationalDto } from './create-aqi-csv-import-operational.dto';

export class UpdateAqiCsvImportOperationalDto extends PartialType(CreateAqiCsvImportOperationalDto) {}
