import "multer";
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import axios from "axios";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import archiver from "archiver";

// If these IDs are not consistent across environments, we will need to fetch them instead.
const EXTENDED_ATTRIBUTES = {
  closedDate: "26cd4bdd-2bd3-43fa-a37b-3edeabb2a4be",
  establishedDate: "e6d3f5b3-ccdf-4c8b-aa4e-a8a783d2db01",
  wellTagNumber: "7ff9bea7-fc37-4c77-9c4e-fb790f5c7e3e",
};

@Injectable()
export class GeodataService {
  private readonly logger = new Logger("GeodataService");
  private readonly execAsync = promisify(exec);
  private readonly tempDir = "/tmp/geodata";

  constructor() {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Run at midnight
  // @Cron("0 0 0 * * *")
  @Cron("0 * * * * *")
  async processAndUpload(): Promise<void> {
    try {
      this.logger.debug("Starting sampling location cron job");

      this.logger.debug("Fetching Sampling Locations");
      const rawData = await this.fetchSamplingLocations();
      this.logger.debug("Generating gdb zip and georeferenced csv file");
      const { csvFile, gdbFile } = await this.transformData(rawData);

      this.logger.debug("Saving gdb zip and csv file to S3");
      await this.saveToS3(csvFile);
      await this.saveToS3(gdbFile);

      this.logger.debug("Cleaning up temp files");
      // Cleanup temporary files
      fs.unlinkSync(csvFile.path);
      fs.unlinkSync(gdbFile.path);
      this.logger.debug("Finished sampling location cron job");
    } catch (error) {
      this.logger.error(`Error in processAndUpload: ${error.message}`);
      throw error;
    }
  }

  async fetchSamplingLocations(): Promise<any> {
    const baseUrl = process.env.BASE_URL_BC_API;
    let cursor = "";
    let total = 0;
    let processedCount = 0;
    let loopCount = 0;
    let entries = [];

    axios.defaults.method = "GET";
    axios.defaults.headers.common["Authorization"] =
      "token " + process.env.AUTH_TOKEN;
    axios.defaults.headers.common["x-api-key"] = process.env.AUTH_TOKEN;

    do {
      const url = `${baseUrl + "v1/samplinglocations"}${cursor ? `?limit=1000&cursor=${cursor}` : "?limit=1000"}`;
      const response = await axios.get(url);

      if (response.status != 200) {
        this.logger.error(
          `Could not ping AQI API for /v1/samplinglocations. Response Code: ${response.status}`,
        );
        return;
      }

      entries = response.data.domainObjects || [];
      cursor = response.data.cursor || null;
      total = response.data.totalCount || 0;

      this.logger.debug(
        `Fetched ${entries.length} entries from /v1/samplinglocations. Processed: ${processedCount}/${total}`,
      );

      // Increment counters
      processedCount += entries.length;
      loopCount++;
      // Log progress periodically
      if (loopCount % 5 === 0 || processedCount >= total) {
        this.logger.debug(`Progress: ${processedCount}/${total}`);
      }

      // Break if we've processed all expected entries
      if (processedCount >= total) {
        this.logger.debug(`Completed fetching data for /v1/samplinglocations`);
        break;
      }

      // Edge case: Break if no entries are returned but the cursor is still valid
      if (entries.length === 0 && cursor) {
        this.logger.warn(
          `Empty response for /v1/samplinglocations with cursor ${cursor}. Terminating early.`,
        );
        break;
      }
    } while (cursor); // Continue only if a cursor is provided

    return entries;
  }

  /**
   * Helper function to grab extended attribute values
   */
  getExtendedAttributeValue(extendedAttributes: any[], attributeId: string) {
    const attribute = extendedAttributes.find(
      (attr) => attr.attributeId === attributeId,
    );
    return attribute ? attribute.text : null;
  }

  /**
   * Generates gdb zip and georeferenced csv file from the raw data
   * @param rawData
   * @returns
   */
  async transformData(rawData: any) {
    let transformedData: any;
    try {
      // Transform into GeoJSON format
      transformedData = {
        type: "FeatureCollection",
        features: rawData.map((location) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              location.longitude ? parseFloat(location.longitude) : null,
              location.latitude ? parseFloat(location.latitude) : null,
            ],
          },
          properties: {
            id: location.id,
            name: location.name,
            comments: location.description,
            locationGroupNames:
              location.samplingLocationGroups.map((group) => group.name) || [],
            locationType: location.type.customId,
            watershedGroupName: null,
            watershedGroupCode: null,
            elevation: location.elevation?.value || null,
            elevationUnit: location.elevation?.unit?.customId || null,
            horizontalCollectionMethod: location.horizontalCollectionMethod,
            numberOfObservations: null,
            numberOfFieldVisits: null,
            earliestFieldVisit: null,
            mostRecentFieldVisit: null,
            closedDate: this.getExtendedAttributeValue(
              location.extendedAttributes,
              EXTENDED_ATTRIBUTES.closedDate,
            ),
            establishedDate: this.getExtendedAttributeValue(
              location.extendedAttributes,
              EXTENDED_ATTRIBUTES.establishedDate,
            ),
            wellTagNumber: this.getExtendedAttributeValue(
              location.extendedAttributes,
              EXTENDED_ATTRIBUTES.wellTagNumber,
            ),
          },
        })),
      };

      const dateString = new Date()
        .toISOString()
        .replaceAll(".", "")
        .replaceAll(":", "");

      // Save GeoJSON to temp file
      const geojsonPath = path.join(
        this.tempDir,
        `samplinglocations-${dateString}.geojson`,
      );
      const jsonString = JSON.stringify(transformedData, null, 2);
      fs.writeFileSync(geojsonPath, jsonString, "utf-8");

      // Convert to GDB (creates a directory)
      const gdbPath = await this.convertToGdb(geojsonPath, dateString);

      // Zip the GDB directory
      const gdbZipPath = `${gdbPath}.zip`;
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(gdbZipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);
        archive.directory(gdbPath, false);
        archive.finalize();
      });

      // Convert to georeferenced CSV using ogr2ogr
      const csvPath = await this.convertToCsv(geojsonPath, dateString);

      // Create file objects for both formats
      const csvFile: Express.Multer.File = {
        fieldname: "file",
        originalname: path.basename(csvPath),
        encoding: "7bit",
        mimetype: "text/csv",
        buffer: fs.readFileSync(csvPath),
        size: fs.statSync(csvPath).size,
        stream: null,
        destination: this.tempDir,
        filename: path.basename(csvPath),
        path: csvPath,
      };

      const gdbFile: Express.Multer.File = {
        fieldname: "file",
        originalname: path.basename(gdbZipPath),
        encoding: "7bit",
        mimetype: "application/zip",
        buffer: fs.readFileSync(gdbZipPath),
        size: fs.statSync(gdbZipPath).size,
        stream: null,
        destination: this.tempDir,
        filename: path.basename(gdbZipPath),
        path: gdbZipPath,
      };

      return { csvFile, gdbFile };
    } catch (error) {
      console.error("Error during transformation:", error);
    }
  }

  /**
   * Saves the sampling locations file to the S3 bucket
   * @param file
   * @returns
   */
  async saveToS3(file: Express.Multer.File) {
    const fileName = file.originalname;

    const OBJECTSTORE_URL = process.env.OBJECTSTORE_URL;
    const OBJECTSTORE_ACCESS_KEY = process.env.OBJECTSTORE_ACCESS_KEY;
    const OBJECTSTORE_SECRET_KEY = process.env.OBJECTSTORE_SECRET_KEY;
    const OBJECTSTORE_BUCKET = process.env.OBJECTSTORE_BUCKET;

    if (!OBJECTSTORE_URL) {
      throw new Error("Objectstore Host Not Defined");
    }

    const dateValue = new Date().toUTCString();

    const contentType = file.mimetype;
    const stringToSign = `PUT\n\n${contentType}\n${dateValue}\n/${OBJECTSTORE_BUCKET}/${fileName}`;

    const signature = crypto
      .createHmac("sha1", OBJECTSTORE_SECRET_KEY)
      .update(stringToSign)
      .digest("base64");

    const requestUrl = `${OBJECTSTORE_URL}/${OBJECTSTORE_BUCKET}/${fileName}`;

    const headers = {
      Authorization: `AWS ${OBJECTSTORE_ACCESS_KEY}:${signature}`,
      Date: dateValue,
      "Content-Type": contentType,
    };

    try {
      await axios({
        method: "put",
        url: requestUrl,
        headers: headers,
        data: file.buffer,
      });
    } catch (error) {
      this.logger.error("Error uploading file to object store:", error);
      throw error;
    }
  }

  private async convertToGdb(
    geojsonPath: string,
    dateString: string,
  ): Promise<string> {
    const gdbPath = path.join(this.tempDir, `output_${dateString}.gdb`);

    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "OpenFileGDB" "${gdbPath}" "${geojsonPath}"`,
      );
      if (stderr) {
        this.logger.warn(`GDB conversion warning: ${stderr}`);
      }
      return gdbPath;
    } catch (error) {
      this.logger.error(`Failed to convert to GDB: ${error.message}`);
      throw error;
    }
  }

  private async convertToCsv(
    geojsonPath: string,
    dateString: string,
  ): Promise<string> {
    const csvPath = path.join(
      this.tempDir,
      `samplinglocations-${dateString}.csv`,
    );
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "CSV" "${csvPath}" "${geojsonPath}" -lco GEOMETRY=AS_XY`,
      );
      if (stderr) {
        this.logger.warn(`CSV conversion warning: ${stderr}`);
      }
      return csvPath;
    } catch (error) {
      this.logger.error(`Failed to convert to CSV: ${error.message}`);
      throw error;
    }
  }
}
