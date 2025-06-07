import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Observation } from "./entities/observation.entity";
import { CreateObservationDto } from "./dto/create-observation.dto";
import { UpdateObservationDto } from "./dto/update-observation.dto";
import { SearchService } from "../search/search.service";

@Injectable()
export class ObservationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Observation)
    private readonly observationRepository: Repository<Observation>,
    private readonly searchService: SearchService,
  ) {}

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

  async refreshObservationsTable(): Promise<void> {
    // fetch all observations from the paginated API and upsert into DB
    const basicSearchDto = {} as any;

    const firstPageRes = await this.searchService.getObservationPromise(
      basicSearchDto,
      process.env.OBSERVATIONS_URL,
      "",
    );
    if (!firstPageRes || firstPageRes.status !== 200) return;
    const firstPage = JSON.parse(firstPageRes.data);
    let cursor = firstPage.cursor;
    // Upsert the first batch
    let batch = firstPage.domainObjects.map((obs: any) => ({
      id: obs.id,
      data: obs,
    }));
    await this.observationRepository.save(batch);
    while (cursor) {
      console.log(`Inserting batch of observations with cursor: ${cursor}`);
      const res = await this.searchService.getObservationPromise(
        basicSearchDto,
        process.env.OBSERVATIONS_URL,
        cursor,
      );
      if (res && res.status === 200) {
        const data = JSON.parse(res.data);
        batch = data.domainObjects.map((obs: any) => ({
          id: obs.id,
          data: obs,
        }));
        await this.observationRepository.save(batch);
        cursor = data.cursor;
      } else {
        break;
      }
    }
  }

  async onModuleInit() {
    console.log(
      "ObservationsService initialized, refreshing observations table...",
    );
    await this.refreshObservationsTable();

    console.log(
      "ObservationsService initialized, finished refreshing observations table...",
    );
  }
}
