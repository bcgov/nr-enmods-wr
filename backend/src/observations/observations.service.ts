import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Observation } from "./entities/observation.entity";
import { CreateObservationDto } from "./dto/create-observation.dto";
import { UpdateObservationDto } from "./dto/update-observation.dto";
import { SearchService } from "../search/search.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class ObservationsService {
  constructor(
    @InjectRepository(Observation)
    private readonly observationRepository: Repository<Observation>,
    private readonly searchService: SearchService,
  ) {
    console.log(
      "OBS_REFRESH_CRON value at startup:",
      process.env.OBS_REFRESH_CRON,
    );
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

  async refreshObservationsTable(): Promise<void> {
    // fetch all observations from the paginated API and upsert into DB
    const basicSearchDto = {} as any;
    let totalCount = 0;

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
    totalCount += batch.length;
    if (totalCount % 50000 === 0) {
      console.log(
        `refreshObservationsTable: Retrieved and upserted ${totalCount} records so far...`,
      );
    }
    while (cursor) {
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
        totalCount += batch.length;
        if (totalCount % 50000 === 0) {
          console.log(
            `refreshObservationsTable: Retrieved and upserted ${totalCount} records so far...`,
          );
        }
        cursor = data.cursor;
      } else {
        break;
      }
    }
  }

  @Cron(process.env.OBS_REFRESH_CRON || CronExpression.EVERY_DAY_AT_2AM, {
    timeZone: "America/Vancouver",
  })
  async scheduledRefreshObservationsTable() {
    const start = Date.now();
    console.log("Scheduled refreshObservationsTable running...");
    await this.refreshObservationsTable();
    const end = Date.now();

    console.log(
      `ObservationsService.  Finished refreshing observations table.  Refresh took ${(end - start) / 1000} seconds.`,
    );
  }
}

// Memory monitor: log memory usage every 5 seconds
setInterval(() => {
  const mem = process.memoryUsage();
  const rssMB = mem.rss / 1024 / 1024;
  if (rssMB > 500) {
    console.log("[MEMORY USAGE]", {
      rss: rssMB.toFixed(2) + " MB",
      heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + " MB",
      heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + " MB",
      external: (mem.external / 1024 / 1024).toFixed(2) + " MB",
      arrayBuffers: (mem.arrayBuffers / 1024 / 1024).toFixed(2) + " MB",
    });
  }
}, 5000);
