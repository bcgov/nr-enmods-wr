import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { AqiCsvImportOperationalService } from './aqi-csv-import-operational.service';
import { CreateAqiCsvImportOperationalDto } from './dto/create-aqi-csv-import-operational.dto';
import { UpdateAqiCsvImportOperationalDto } from './dto/update-aqi-csv-import-operational.dto';

@Controller('aqi-csv-import-operational')
export class AqiCsvImportOperationalController {
  constructor(private readonly service: AqiCsvImportOperationalService) {}

  @Post()
  create(@Body() dto: CreateAqiCsvImportOperationalDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.service.findOne(Number(id));
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() dto: UpdateAqiCsvImportOperationalDto) {
//     return this.service.update(Number(id), dto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.service.remove(Number(id));
//   }
}
