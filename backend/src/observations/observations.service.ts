import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Observation } from "./entities/observation.entity";
import { CreateObservationDto } from "./dto/create-observation.dto";
import { UpdateObservationDto } from "./dto/update-observation.dto";
import { SearchService } from "../search/search.service";

@Injectable()
export class ObservationsService {
  private readonly logger = new Logger("ObservationsService");
  constructor(
    @InjectRepository(Observation)
    private readonly observationRepository: Repository<Observation>,
  ) {
    this.logger.log("OBS_REFRESH_CRON value at startup:", process.env.OBS_REFRESH_CRON);
  }

  async create(createObservationDto: CreateObservationDto) {
    return this.observationRepository.save(createObservationDto);
  }

  async findAll() {
    return this.observationRepository.find();
  }

  async findOne(id: string) {
    return this.observationRepository.findOneBy({ id });
  }

  async update(id: string, updateObservationDto: UpdateObservationDto) {
    await this.observationRepository.update(id, updateObservationDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    return this.observationRepository.delete(id);
  }

  async bulkUpsert(observations: CreateObservationDto[]) {
    // Upsert all observations (replace on conflict)
    return this.observationRepository.save(observations);
  }
}