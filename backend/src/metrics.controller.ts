import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { register } from "./prom";
@Controller("metrics")
export class MetricsController {
  constructor() {}

  @Get()
  async getMetrics(@Res() res: Response) {
    const appMetrics = await register.metrics();
    res.end(appMetrics);
  }
}
