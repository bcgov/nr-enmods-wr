import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AqiCsvImportOperational } from './entities/aqi-csv-import-operational.entity';
import { CreateAqiCsvImportOperationalDto } from './dto/create-aqi-csv-import-operational.dto';
import { UpdateAqiCsvImportOperationalDto } from './dto/update-aqi-csv-import-operational.dto';

@Injectable()
export class AqiCsvImportOperationalService {
  constructor(
    @InjectRepository(AqiCsvImportOperational)
    private readonly repo: Repository<AqiCsvImportOperational>,
  ) {}

  async create(dto: CreateAqiCsvImportOperationalDto): Promise<AqiCsvImportOperational> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(): Promise<AqiCsvImportOperational[]> {
    return this.repo.find();
  }

//   async findOne(id: number): Promise<AqiCsvImportOperational> {
//     return this.repo.findOneBy({ id });
//   }

//   async update(id: number, dto: UpdateAqiCsvImportOperationalDto): Promise<AqiCsvImportOperational> {
//     await this.repo.update(id, dto);
//     return this.findOne(id);
//   }

//   async remove(id: number): Promise<void> {
//     await this.repo.delete(id);
//   }
}
