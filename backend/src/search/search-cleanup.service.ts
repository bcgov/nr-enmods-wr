import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { jobs } from "src/jobs/searchjob";
import * as fs from "fs";

@Injectable()
export class SearchCleanupService {
  private readonly logger = new Logger("SearchCleanupService");

  /**
   * Runs every 6 hours to clean up old jobs and orphaned files
   * Removes jobs older than 24 hours and their associated CSV files
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  public cleanupOldJobs() {
    this.logger.log("Starting cleanup of old jobs and files...");
    const maxJobAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const dataDir = `${process.cwd()}/data`;
    let deletedJobCount = 0;
    let deletedFileCount = 0;

    // Clean up old job metadata
    for (const [jobId, job] of Object.entries(jobs)) {
      if (now - job.createdAt > maxJobAge) {
        // Delete associated file if it exists
        if (job.fileName) {
          const filePath = `${dataDir}/${job.fileName}`;
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              this.logger.debug(`Deleted old file: ${filePath}`);
              deletedFileCount++;
            }
          } catch (err) {
            this.logger.error(`Error deleting file ${filePath}:`, err);
          }
        }
        delete jobs[jobId];
        this.logger.debug(`Deleted old job: ${jobId}`);
        deletedJobCount++;
      }
    }

    // Clean up orphaned files (tmp_obs_export_*.csv files older than 24 hours)
    try {
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir);
        files.forEach((file) => {
          if (file.match(/^tmp_obs_export_\d+\.csv$/)) {
            const filePath = `${dataDir}/${file}`;
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > maxJobAge) {
              try {
                fs.unlinkSync(filePath);
                this.logger.debug(`Deleted orphaned file: ${filePath}`);
                deletedFileCount++;
              } catch (err) {
                this.logger.error(
                  `Error deleting orphaned file ${filePath}:`,
                  err,
                );
              }
            }
          }
        });
      }
    } catch (err) {
      this.logger.error("Error reading data directory:", err);
    }

    this.logger.log(
      `Cleanup completed: Deleted ${deletedJobCount} jobs and ${deletedFileCount} files`,
    );
  }
}
