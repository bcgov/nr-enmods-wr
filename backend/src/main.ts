import { NestExpressApplication } from "@nestjs/platform-express";
import { bootstrap } from "./app";
import { Logger } from "@nestjs/common";

const logger = new Logger("NestApplication");
bootstrap()
  .then(async (app: NestExpressApplication) => {
    await app.listen(3000);
    logger.log(`Listening on ${await app.getUrl()}`);
  })
  .catch((err) => {
    logger.error(err);
  });

setInterval(() => {
  const mem = process.memoryUsage();
  console.log("[MEMORY USAGE]", {
    rss: (mem.rss / 1024 / 1024).toFixed(2) + " MB",
    heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + " MB",
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + " MB",
    external: (mem.external / 1024 / 1024).toFixed(2) + " MB",
    arrayBuffers: (mem.arrayBuffers / 1024 / 1024).toFixed(2) + " MB",
  });
}, 5000);
