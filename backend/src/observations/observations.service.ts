import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Observation } from "./entities/observation.entity";
import { CreateObservationDto } from "./dto/create-observation.dto";
import { UpdateObservationDto } from "./dto/update-observation.dto";
import { SearchService } from "../search/search.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { subHours, formatISO } from "date-fns";
import { ObservationRefreshService } from "src/observation_refresh_log/observation-refresh-log.service";

@Injectable()
export class ObservationsService {
  private readonly logger = new Logger("ObservationsService");
  private refreshInProgress = false;

  constructor(
    @InjectRepository(Observation)
    private readonly observationRepository: Repository<Observation>,
    private readonly searchService: SearchService,
    private readonly observationRefreshService: ObservationRefreshService,
  ) {
    this.logger.log(
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

  // fetch all observations from the paginated API and upsert into DB
  async refreshObservationsTable(): Promise<void> {
    this.refreshInProgress = true;
    const start = Date.now();
    try {
      this.logger.log("Scheduled refreshObservationsTable running...");

      const basicSearchDto = {} as any;
      let totalCount = 0;
      const BATCH_SIZE = 1000;

      // Get last successful refresh time
      // We'll use this to only fetch observations that have been modified since the last successful refresh
      const lastSuccess = await this.observationRefreshService.getLastSuccess();
      const startModificationTime = lastSuccess
        ? formatISO(subHours(new Date(lastSuccess), 2)) // subtract 1 hour for overlap.  e.g. fetch observations modified since the last refresh, minus an hour
        : undefined;

      // get the first page of observations
      // If startModificationTime is defined, it will be used to filter results
      // If not, it will fetch all observations regardless of modification time
      const firstPageRes = startModificationTime
        ? await this.searchService.getObservationPromise(
            basicSearchDto,
            process.env.OBSERVATIONS_URL,
            "",
            false,
            startModificationTime,
          )
        : await this.searchService.getObservationPromise(
            basicSearchDto,
            process.env.OBSERVATIONS_URL,
            "",
            false,
          );
      // If the first page request failed, log and exit
      if (!firstPageRes || firstPageRes.status !== 200) return;
      const firstPage = JSON.parse(firstPageRes.data);
      let cursor = firstPage.cursor;

      // Helper to save a batch in its own transaction
      const saveBatch = async (batch: any[]) => {
        const queryRunner =
          this.observationRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          await queryRunner.manager.save(Observation, batch);
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
        } finally {
          await queryRunner.release();
        }
      };

      // Collect and save the first batch
      let batch = [];
      for (const obs of firstPage.domainObjects) {
        batch.push({ id: obs.id, data: toMinimalObservation(obs) });
        if (batch.length >= BATCH_SIZE) {
          await saveBatch(batch);
          totalCount += batch.length;
          batch = [];
          if (totalCount % 50000 === 0) {
            this.logger.log(
              `refreshObservationsTable: Retrieved and upserted ${totalCount} records so far...`,
            );
          }
        }
      }

      // Save any remaining from the first page
      if (batch.length > 0) {
        await saveBatch(batch);
        totalCount += batch.length;
        batch = [];
      }

      let previousCursor = null;

      // Continue with the rest of the pages.
      // Note that when supplying the startModificationTime, the API uses * for the cursor.  All the results should have been retrieved in the previous api request, so this woldn't be needed
      while (cursor && cursor !== "*" && cursor !== previousCursor) {
        // Avoid infinite loop by checking if cursor hasn't changed
        previousCursor = cursor;

        const res = startModificationTime
          ? await this.searchService.getObservationPromise(
              basicSearchDto,
              process.env.OBSERVATIONS_URL,
              cursor,
              false,
              startModificationTime,
            )
          : await this.searchService.getObservationPromise(
              basicSearchDto,
              process.env.OBSERVATIONS_URL,
              cursor,
              false,
            );
        if (res && res.status === 200) {
          const data = JSON.parse(res.data);
          for (const obs of data.domainObjects) {
            batch.push({ id: obs.id, data: toMinimalObservation(obs) });
            if (batch.length >= BATCH_SIZE) {
              await saveBatch(batch);
              totalCount += batch.length;
              batch = [];
              if (totalCount % 50000 === 0) {
                this.logger.log(
                  `refreshObservationsTable: Retrieved and upserted ${totalCount} records so far...`,
                );
              }
            }
          }
          cursor = data.cursor;
        } else {
          break;
        }
      }

      // Save any remaining records in the last batch
      if (batch.length > 0) {
        await saveBatch(batch);
        totalCount += batch.length;
      }

      if (startModificationTime) {
        this.logger.log(
          `Total items returned since ${startModificationTime}: ${totalCount}`,
        );
      }
    } finally {
      this.refreshInProgress = false;

      const end = Date.now();

      this.logger.log(
        `ObservationsService.  Finished refreshing observations table.  Refresh took ${(end - start) / 1000} seconds.`,
      );
      // Log the successful refresh time
      await this.observationRefreshService.logSuccess();
    }
  }

  @Cron(process.env.OBS_REFRESH_CRON || CronExpression.EVERY_DAY_AT_2AM, {
    timeZone: "America/Vancouver",
  })
  async scheduledRefreshObservationsTable() {
    if (this.refreshInProgress) {
      this.logger.warn(
        "refreshObservationsTable: Refresh already in progress. Skipping this run.",
      );
      return;
    } else {
      await this.refreshObservationsTable();
    }
  }
}

function toMinimalObservation(obs: any) {
  return {
    id: obs.id,
    samplingLocationId: obs?.samplingLocation?.id,
    fieldVisit: {
      extendedAttributes: obs.fieldVisit?.extendedAttributes,
      project: { name: obs.fieldVisit?.project?.name },
      samplingLocation: { name: obs.fieldVisit?.samplingLocation?.name },
      startTime: obs.fieldVisit?.startTime,
      endTime: obs.fieldVisit?.endTime,
      participants: obs.fieldVisit?.participants,
    },
    specimen: {
      extendedAttributes: obs.specimen?.extendedAttributes,
      filtered: obs.specimen?.filtered,
      filtrationComment: obs.specimen?.filtrationComment,
    },
    activity: {
      comment: obs.activity?.comment,
      endTime: obs.activity?.endTime,
      extendedAttributes: obs.activity?.extendedAttributes,
    },
    numericResult: {
      sampleFraction: obs.numericResult?.sampleFraction,
    },
    labResultDetails: {
      dateReceived: obs?.labResultDetails?.dateReceived,
    },
    observedPropertyId: obs?.observedProperty?.id,
    qualityControlType: obs?.qualityControlType,
    dataClassification: obs?.dataClassification,
  };
}

// Memory monitor: log memory usage every 5 seconds
setInterval(() => {
  const mem = process.memoryUsage();
  const rssMB = mem.rss / 1024 / 1024;
  if (rssMB > 250) {
    /*
    this.logger.log("[MEMORY USAGE]", {
      rss: rssMB.toFixed(2) + " MB",
      heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + " MB",
      heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + " MB",
      external: (mem.external / 1024 / 1024).toFixed(2) + " MB",
      arrayBuffers: (mem.arrayBuffers / 1024 / 1024).toFixed(2) + " MB",
    });
    */
  }
}, 5000);
