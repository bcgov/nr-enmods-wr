import { Controller, Get, Post } from "@nestjs/common";
import { ObservationRefreshService } from "./observation-refresh-log.service";

@Controller("observation-refresh")
export class ObservationRefreshController {
  constructor(private readonly service: ObservationRefreshService) {}

  @Get("last")
  async getLastSuccess() {
    return { lastSuccess: await this.service.getLastSuccess() };
  }

  @Post("log")
  async logSuccess() {
    return await this.service.logSuccess();
  }
}
