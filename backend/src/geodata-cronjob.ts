/**
 * Standalone script for running the GeodataService processAndUpload job as an OpenShift CronJob.
 * This is invoked via the geodata-cronjob.yaml Helm template instead of using @Cron decorator.
 *
 * Usage: node geodata-cronjob.js
 */

import "dotenv/config";
import { DataSource } from "typeorm";
import { Logger } from "@nestjs/common";
import ormconfig from "src/ormconfig";
import { GeodataService } from "./geodata/geodata.service";
import { FileInfo } from "./geodata/entities/file-info.entity";

const logger = new Logger("GeodataSync");

async function runGeodataSync() {
  let dataSource: DataSource | null = null;

  try {
    logger.log("Initializing database connection...");

    // Create and initialize the data source
    dataSource = new DataSource(ormconfig as any);
    await dataSource.initialize();

    logger.log("Database connection established");

    // Get the FileInfo repository to pass to GeodataService
    const fileInfoRepository = dataSource.getRepository(FileInfo);

    // Instantiate the GeodataService
    logger.log("Instantiating GeodataService...");
    const geodataService = new GeodataService(fileInfoRepository);

    // Run the processAndUpload method
    logger.log("Starting geodata sync process...");
    await geodataService.processAndUpload();

    logger.log("Geodata sync process completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error(
      `Error during geodata sync: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Clean up database connection
    if (dataSource && dataSource.isInitialized) {
      logger.log("Closing database connection...");
      await dataSource.destroy();
    }
  }
}

// Run the cronjob
runGeodataSync();
