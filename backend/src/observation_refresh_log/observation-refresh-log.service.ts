import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ObservationRefresh } from "./entities/observation-refresh-log.entity";

@Injectable()
export class ObservationRefreshService {
  private readonly logger = new Logger("ObservationRefreshService");
  constructor(
    @InjectRepository(ObservationRefresh)
    private readonly refreshRepo: Repository<ObservationRefresh>,
  ) {}

  async getLastSuccess(): Promise<Date | null> {
    const last = await this.refreshRepo.find({
      order: { lastSuccess: "DESC" },
      take: 1,
    });
    return last.length ? last[0].lastSuccess : null;
  }

  async logSuccess(): Promise<ObservationRefresh> {
    // Create a new entry with the current timestamp
    this.logger;
    const entry = this.refreshRepo.create({ lastSuccess: new Date() });
    return this.refreshRepo.save(entry);
  }
}
