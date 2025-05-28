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
import { InjectRepository } from "@nestjs/typeorm";
import { FileInfo } from "./entities/file-info.entity";
import { Repository } from "typeorm";
import process from "process";

// If these IDs are not consistent across environments, we will need to fetch them instead.
const EXTENDED_ATTRIBUTES = {
  closedDate: "26cd4bdd-2bd3-43fa-a37b-3edeabb2a4be",
  establishedDate: "e6d3f5b3-ccdf-4c8b-aa4e-a8a783d2db01",
  wellTagNumber: "7ff9bea7-fc37-4c77-9c4e-fb790f5c7e3e",
};

@Injectable()
export class GeodataService {
  constructor(
    @InjectRepository(FileInfo)
    private readonly fileInfoRepository: Repository<FileInfo>,
  ) {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private readonly logger = new Logger("GeodataService");
  private readonly execAsync = promisify(exec);
  private readonly tempDir = "/tmp/geodata";
  private readonly baseUrl = process.env.BASE_URL_BC_API;
  private readonly samplingLocationsEndpoint =
    process.env.SAMPLING_LOCATIONS_ENDPOINT;

  @Cron("30 46 22 * * *")
  async processAndUpload(): Promise<void> {
    try {
      this.logger.debug("Starting sampling location cron job");
      this.logger.debug(process.memoryUsage());
      const start = Date.now();
      // Used for file names & datebase timestamp
      const newDate = new Date();
      // Fetch latest gpkg from S3
      const { latestFilePath, latestDateCreated } =
        await this.fetchLatestGpkg();
      this.logger.debug(process.memoryUsage());
      // Fetch data that has been uploaded since the last run
      const rawData = await this.fetchSamplingLocations(latestDateCreated);
      this.logger.debug(process.memoryUsage());
      // Transform the raw data to geojson format
      const transformedData = await this.transformData(rawData);
      // Perform intersections & write the files locally
      const { gdbPath, csvPath, gpkgPath } = await this.intersectAndGenerate(
        latestFilePath,
        transformedData,
        newDate,
      );
      // Upload the files to S3
      await this.uploadFiles(gdbPath, csvPath, gpkgPath);

      // Save a file info entry into the database
      await this.saveNewFileInfo(path.basename(gpkgPath), newDate);
      this.logger.debug(process.memoryUsage());

      // Clean up the locally generated files
      await this.cleanUpFiles();

      // Timer logs
      this.logger.debug("Finished sampling location cron job");
      const end = Date.now();
      this.logger.debug(
        `Time Taken: ${Math.floor((end - start) / 3600000)} hours, ${Math.floor(((end - start) / 60000) % 60)} minutes ${Math.floor(((end - start) / 1000) % 60)} seconds`,
      );
    } catch (error) {
      this.logger.error(`Error in processAndUpload: ${error.message}`);
      throw error;
    }
  }

  async saveNewFileInfo(fileName: string, dateCreated: Date) {
    const newFileInfo = this.fileInfoRepository.create({
      file_name: fileName,
      date_created: dateCreated,
    });
    await this.fileInfoRepository.save(newFileInfo);
  }

  async fetchLatestGpkg(): Promise<{
    latestFilePath: string;
    latestDateCreated: Date;
  } | null> {
    this.logger.debug("Attempting to fetch the latest GPKG file.");

    // 1. Get file info from database with most recent date_created value
    let latestFileInfo;
    try {
      latestFileInfo = await this.fileInfoRepository.findOne({
        where: {},
        order: { date_created: "DESC" },
      });
    } catch (dbError) {
      this.logger.error(
        `Error fetching latest file info from database: ${dbError.message}`,
        dbError.stack,
      );
      return null;
    }

    if (!latestFileInfo) {
      this.logger.warn("No file information found in the database.");
      return null;
    }

    const fileName = latestFileInfo.file_name;
    if (!fileName) {
      this.logger.error(
        `File information found (ID: ${latestFileInfo.id}), but file_name is missing.`,
      );
      return null;
    }

    this.logger.debug(`Latest file to fetch from S3: ${fileName}`);

    // 2. Fetch that file from the S3 bucket
    const OBJECTSTORE_URL = process.env.OBJECTSTORE_URL;
    const OBJECTSTORE_ACCESS_KEY = process.env.OBJECTSTORE_ACCESS_KEY;
    const OBJECTSTORE_SECRET_KEY = process.env.OBJECTSTORE_SECRET_KEY;
    const OBJECTSTORE_BUCKET = process.env.OBJECTSTORE_BUCKET;
    const OBJECTSTORE_FOLDER = process.env.OBJECTSTORE_FOLDER;

    if (
      !OBJECTSTORE_URL ||
      !OBJECTSTORE_ACCESS_KEY ||
      !OBJECTSTORE_SECRET_KEY ||
      !OBJECTSTORE_BUCKET ||
      !OBJECTSTORE_FOLDER
    ) {
      this.logger.error(
        "S3 object store configuration is incomplete. Check environment variables.",
      );
      return null;
    }

    const dateValue = new Date().toUTCString();
    const stringToSign = `GET\n\n\n${dateValue}\n/${OBJECTSTORE_BUCKET}/${OBJECTSTORE_FOLDER}/${fileName}`;

    const signature = crypto
      .createHmac("sha1", OBJECTSTORE_SECRET_KEY)
      .update(stringToSign)
      .digest("base64");

    const requestUrl = `${OBJECTSTORE_URL}/${OBJECTSTORE_BUCKET}/${OBJECTSTORE_FOLDER}/${fileName}`;

    const headers = {
      Authorization: `AWS ${OBJECTSTORE_ACCESS_KEY}:${signature}`,
      Date: dateValue,
    };

    let s3response;
    try {
      this.logger.debug(`Fetching ${fileName} from S3 URL: ${requestUrl}`);
      s3response = await axios({
        method: "get",
        url: requestUrl,
        headers: headers,
        responseType: "stream",
      });

      if (s3response.status !== 200) {
        this.logger.error(
          `Failed to fetch file from S3. Status: ${s3response.status}`,
        );
        return null;
      }
      this.logger.debug(`Successfully fetched ${fileName} from S3.`);
    } catch (error) {
      this.logger.error(
        `Error fetching file ${fileName} from S3: ${error.message}`,
        error.stack,
      );
      return null;
    }
    // 3. Save that file to /tmp/geodata/
    // The tempDir is '/tmp/geodata' and is ensured to exist in the constructor.
    const filePath = path.join(this.tempDir, fileName);

    try {
      // Create a write stream for the file
      const fileStream = fs.createWriteStream(filePath);

      // Pipe the s3response stream to the file
      await new Promise<void>((resolve, reject) => {
        s3response.data.pipe(fileStream);
        fileStream.on("finish", () => {
          resolve();
        });
        fileStream.on("error", (err) => {
          reject(err);
        });
        s3response.data.on("error", (err) => {
          reject(err);
        });
      });

      this.logger.debug(`Successfully saved ${fileName} to ${filePath}`);
      // Return the path to the saved file & latest timestamp
      return {
        latestFilePath: filePath,
        latestDateCreated: latestFileInfo.date_created,
      };
    } catch (error) {
      this.logger.error(
        `Error saving file ${fileName} to ${filePath}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Fetches all sampling location entries.
   */
  async fetchSamplingLocations(latestDateCreated: Date): Promise<any> {
    let cursor = "";
    let total = 0;
    let processedCount = 0;
    let loopCount = 0;
    let entries = [];
    let allEntries = [];

    axios.defaults.method = "GET";
    axios.defaults.headers.common["Authorization"] =
      "token " + process.env.AUTH_TOKEN;
    axios.defaults.headers.common["x-api-key"] = process.env.AUTH_TOKEN;

    this.logger.debug("Fetching sampling locations...");
    const start = Date.now();
    do {
      const pstDate = latestDateCreated
        ? new Date(
            latestDateCreated.toLocaleString("en-US", {
              timeZone: "America/Los_Angeles",
            }),
          ).toISOString()
        : null;
      const startModificationTime = pstDate
        ? `&startModificationTime="${pstDate}"`
        : "";
      const url = `${this.baseUrl}${this.samplingLocationsEndpoint}${cursor ? `?limit=1000${startModificationTime}&cursor=${cursor}` : `?limit=1000${startModificationTime}`}`;
      const response = await axios.get(url);

      if (response.status != 200) {
        this.logger.error(
          `Could not ping AQI API for /v1/samplinglocations. Response Code: ${response.status}`,
        );
        return;
      }
      entries = response.data.domainObjects;
      allEntries = allEntries.concat(entries);
      cursor = response.data.cursor || null;
      total = response.data.totalCount || 0;

      // Logging
      this.logger.debug(
        `Fetched ${entries.length} entries from /v1/samplinglocations. Processed: ${processedCount}/${total}`,
      );

      // Increment counters
      processedCount += entries.length;
      loopCount++;

      if (loopCount % 5 === 0 || processedCount >= total) {
        this.logger.debug(`Progress: ${processedCount}/${total}`);
      }

      // Break if we've processed all expected entries
      if (processedCount >= total) {
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
    const end = Date.now();
    this.logger.debug(
      `Fetching sampling locations complete, time taken: ${Math.floor((end - start) / 3600000)} hours, ${Math.floor(((end - start) / 60000) % 60)} minutes ${Math.floor(((end - start) / 1000) % 60)} seconds`,
    );
    return allEntries;
  }

  /**
   * Grabs the summary data for each sampling location
   */
  async fetchSummaries(rawData: any): Promise<any> {
    this.logger.debug("Fetching summaries...");
    const baseUrl = process.env.BASE_URL_BC_API;
    const route = "v1/samplinglocations/";
    const entries = [];
    const totalEntries = rawData.length;
    let counter = 0;

    axios.defaults.method = "GET";
    axios.defaults.headers.common["Authorization"] =
      "token " + process.env.AUTH_TOKEN;
    axios.defaults.headers.common["x-api-key"] = process.env.AUTH_TOKEN;

    const start = Date.now();
    for (let item of rawData) {
      const url = `${baseUrl + route + item.id}/summary`;
      const response = await axios.get(url);

      if (response.status != 200) {
        this.logger.error(
          `Could not ping AQI API for ${route}. Response Code: ${response.status}`,
        );
        return;
      }
      entries.push(response.data);
      if (counter % 100 === 0) {
        this.logger.debug(`Fetching entries ${counter}/${totalEntries}`);
      }
      counter++;
    }
    const end = Date.now();
    this.logger.debug(
      `Fetching summaries complete, time taken: ${Math.floor((end - start) / 3600000)} hours, ${Math.floor(((end - start) / 60000) % 60)} minutes ${Math.floor(((end - start) / 1000) % 60)} seconds`,
    );
    const summaryMap = new Map();
    if (Array.isArray(entries)) {
      for (let i = 0; i < entries.length; i++) {
        const summary = entries[i];
        // Try to match by id, fallback to index if not present
        const locationId = rawData[i]?.id;
        if (locationId) {
          summaryMap.set(locationId, summary);
        }
      }
    }
    return summaryMap;
  }

  /**
   * Helper function to grab extended attribute values
   */
  getExtendedAttributeValue(extendedAttributes: any[], attributeId: string) {
    const attribute = extendedAttributes.find(
      (attr) => attr.attributeId === attributeId,
    );
    return attribute ? attribute.text : "NA";
  }

  /**
   * 1. Receives and converts raw data to a simplified geojson format from processAndUpload
   * 2. Passes this on to intersectAndGenerate for file operations
   * 3. Zip up gdb and create file objects for gdb.zip & csv
   * 4. Pass file objects back up to processAndUpload
   *
   * @param rawData
   * @returns
   */
  async transformData(rawData: any) {
    let transformedData: any;
    try {
      // Transform into GeoJSON format (now for GPKG)
      const summaryMap = await this.fetchSummaries(rawData);
      transformedData = {
        type: "FeatureCollection",
        features: rawData.map((location) => {
          const summary = summaryMap.get(location.id) || {};
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                location.longitude ? parseFloat(location.longitude) : null,
                location.latitude ? parseFloat(location.latitude) : null,
              ],
            },
            properties: {
              id: location.id || "NA",
              name: location.name || "NA",
              comments: location.description || "NA",
              locationGroupNames:
                (location.samplingLocationGroups &&
                  location.samplingLocationGroups.map(
                    (group) => group.name || "NA",
                  )) ||
                [],
              locationType: (location.type && location.type.customId) || "NA",
              elevation:
                (location.elevation && location.elevation.value) || "NA",
              elevationUnit:
                (location.elevation &&
                  location.elevation.unit &&
                  location.elevation.unit.customId) ||
                "NA",
              horizontalCollectionMethod:
                location.horizontalCollectionMethod || "NA",
              observationCount: summary.observationCount,
              fieldVisitCount: summary.fieldVisitCount,
              latestFieldVisit:
                (summary.latestFieldVisit &&
                  summary.latestFieldVisit.startTime) ||
                "NA",
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
          };
        }),
      };

      return transformedData;
    } catch (error) {
      console.error("Error during transformation:", error);
    }
  }

  /**
   * 1. Receives new entries from aqi that have been transformed into a geojson format
   * 2. Write the geojson to disk and convert it into a gpkg
   * 3. Performs intersection between watershed gdb & new sampling locations gpkg
   * 4. Upserts intersected new sampling locations gpkg into the previous gpkg that we loaded from s3
   * 5. Generates new gpkg, gdb and csv, returning their paths
   * @param transformedData
   * @returns
   */
  private async intersectAndGenerate(
    latestFilePath: string,
    transformedData: any,
    newDate: Date,
  ): Promise<{ gdbPath: string; csvPath: string; gpkgPath: string }> {
    const start = Date.now();

    // used to in file names
    const dateString = newDate
      .toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/[\/\s,:]/g, "_");
    // Watershed GDB variables
    const watershedGdbPath = path.resolve(
      __dirname,
      "FWA_WATERSHED_GROUPS_POLY.gdb",
    );
    const watershedLayer = "WHSE_BASEMAPPING_FWA_WATERSHED_GROUPS_POLY";
    // Layer name
    const intersectedLayerName = "sampling_locations";
    // geojson file location
    const geojsonInputPath = path.join(
      this.tempDir,
      `input_${dateString}.geojson`,
    );
    // gpkg default layer name (TODO: replace this with intersectedLayerName)
    const gpkgLayerName = `input_${dateString}`;
    // new transformed data gpkg path
    const gpkgInputPath = path.join(this.tempDir, `input_${dateString}.gpkg`);
    // new transformed data gpkg path after intersection
    const gpkgOutputPath = path.join(
      this.tempDir,
      `intersect_${dateString}.gpkg`,
    );
    // final combined gpkg data path
    const gpkgPath = path.join(
      this.tempDir,
      `sampling_locations_${dateString}.gpkg`,
    );
    // vrt file path, used for intersecting the watershed gdb with the transformed data gpkg
    const vrtPath = path.join(this.tempDir, `watershed_geo_${dateString}.vrt`);
    // gdb file path
    const gdbPath = path.join(
      this.tempDir,
      `sampling_locations_${dateString}.gdb`,
    );
    // csv file path
    const csvPath = path.join(
      this.tempDir,
      `sampling_locations_${dateString}.csv`,
    );

    // Copy the base GPKG to the output path
    try {
      this.logger.debug(
        `Creating combined GPKG using ${latestFilePath} as base`,
      );
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GPKG "${gpkgPath}" "${latestFilePath}" -nln ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`Base GPKG copy stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Base GPKG copy failed: ${error.message}`);
      throw error;
    }

    // Only upsert if there is new data to add
    if (transformedData.length > 0) {
      // Save GeoJSON to temp file
      const jsonString = JSON.stringify(transformedData);
      fs.writeFileSync(geojsonInputPath, jsonString, "utf-8");

      // Convert GeoJSON to GPKG
      try {
        const { stdout, stderr } = await this.execAsync(
          `ogr2ogr -f GPKG \"${gpkgInputPath}\" \"${geojsonInputPath}\" -nln ${gpkgLayerName}`,
        );
        if (stderr) this.logger.warn(`GPKG conversion warning: ${stderr}`);
      } catch (error) {
        this.logger.error(`Failed to convert to GPKG: ${error.message}`);
        throw error;
      }

      // VRT for GPKG and GDB
      const vrtXml = `
      <OGRVRTDataSource>
        <OGRVRTLayer name="${gpkgLayerName}">
          <SrcDataSource>${gpkgInputPath}</SrcDataSource>
          <SrcLayer>${gpkgLayerName}</SrcLayer>
          <GeometryType>wkbPoint</GeometryType>
          <LayerSRS>EPSG:4326</LayerSRS>
        </OGRVRTLayer>
        <OGRVRTLayer name="${watershedLayer}">
          <SrcDataSource>${watershedGdbPath}</SrcDataSource>
          <SrcLayer>${watershedLayer}</SrcLayer>
          <GeometryType>wkbPolygon</GeometryType>
          <LayerSRS>EPSG:4269</LayerSRS>
        </OGRVRTLayer>
      </OGRVRTDataSource>`;
      fs.writeFileSync(vrtPath, vrtXml.trim());

      this.logger.debug("Intesecting data...");
      const sql = `
      SELECT
        p.*,
        MIN(w.WATERSHED_GROUP_CODE) AS watershedGroupCode,
        MIN(w.WATERSHED_GROUP_NAME) AS watershedGroupName
      FROM ${gpkgLayerName} p
      LEFT JOIN ${watershedLayer} w
      ON ST_Intersects(p.geometry, w.geometry)
      GROUP BY p.id
    `.replace(/\s+/g, " ");

      this.logger.debug("Generating Watershed Intersected GPKG");

      // Generate GPKG as the intersection output
      try {
        const { stdout, stderr } = await this.execAsync(
          `ogr2ogr -f GPKG "${gpkgOutputPath}" "${vrtPath}" -dialect sqlite -sql "${sql}" -nln ${intersectedLayerName}`,
        );
        if (stderr) {
          this.logger.warn(`Watershed join stderr: ${stderr}`);
        }
      } catch (error: any) {
        this.logger.error(`Watershed join failed: ${error.message}`);
        throw error;
      }

      // Upsert the new data into the combined GPKG
      try {
        this.logger.debug(
          `Upserting new data from ${gpkgOutputPath} into ${gpkgPath}`,
        );
        const { stdout, stderr } = await this.execAsync(
          `ogr2ogr -f GPKG "${gpkgPath}" "${gpkgOutputPath}" -nln ${intersectedLayerName} -upsert`,
        );
        if (stderr) {
          this.logger.warn(`New data upsert stderr: ${stderr}`);
        }
      } catch (error: any) {
        this.logger.error(`New data upsert failed: ${error.message}`);
        throw error;
      }

      this.logger.debug(`Successfully created combined GPKG at ${gpkgPath}`);
    }

    // generate gdb from GPKG
    this.logger.debug("Generating GDB");
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "OpenFileGDB" "${gdbPath}" "${gpkgPath}" ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`GDB generate stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`GDB generate failed: ${error.message}`);
      throw error;
    }

    // generate csv from GPKG
    this.logger.debug("Generating CSV");
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "CSV" "${csvPath}" "${gpkgPath}" -lco GEOMETRY=AS_XY`,
      );
      if (stderr) {
        this.logger.warn(`CSV generate stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to convert to CSV: ${error.message}`);
      throw error;
    }
    const end = Date.now();
    this.logger.debug(
      `Intersect & file generation complete, time taken: ${Math.floor((end - start) / 3600000)} hours, ${Math.floor(((end - start) / 60000) % 60)} minutes ${Math.floor(((end - start) / 1000) % 60)} seconds`,
    );

    // return file paths
    return { gdbPath, csvPath, gpkgPath };
  }

  async uploadFiles(gdbPath: string, csvPath: string, gpkgPath: string) {
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

    // Upload each file using streams directly
    await this.saveToS3({
      originalname: path.basename(csvPath),
      mimetype: "text/csv",
      path: csvPath,
    });

    await this.saveToS3({
      originalname: path.basename(gdbZipPath),
      mimetype: "application/zip",
      path: gdbZipPath,
    });

    await this.saveToS3({
      originalname: path.basename(gpkgPath),
      mimetype: "application/x-sqlite3",
      path: gpkgPath,
    });
  }

  /**
   * Saves the sampling locations file to the S3 bucket
   * @param file
   * @returns
   */
  async saveToS3(file: {
    originalname: string;
    mimetype: string;
    path: string;
  }) {
    const fileName = file.originalname;

    const OBJECTSTORE_URL = process.env.OBJECTSTORE_URL;
    const OBJECTSTORE_ACCESS_KEY = process.env.OBJECTSTORE_ACCESS_KEY;
    const OBJECTSTORE_SECRET_KEY = process.env.OBJECTSTORE_SECRET_KEY;
    const OBJECTSTORE_BUCKET = process.env.OBJECTSTORE_BUCKET;
    const OBJECTSTORE_FOLDER = process.env.OBJECTSTORE_FOLDER;

    if (!OBJECTSTORE_URL) {
      throw new Error("Objectstore Host Not Defined");
    }

    const dateValue = new Date().toUTCString();

    const contentType = file.mimetype;
    const stringToSign = `PUT\n\n${contentType}\n${dateValue}\n/${OBJECTSTORE_BUCKET}/${OBJECTSTORE_FOLDER}/${fileName}`;

    const signature = crypto
      .createHmac("sha1", OBJECTSTORE_SECRET_KEY)
      .update(stringToSign)
      .digest("base64");

    const requestUrl = `${OBJECTSTORE_URL}/${OBJECTSTORE_BUCKET}/${OBJECTSTORE_FOLDER}/${fileName}`;

    const headers = {
      Authorization: `AWS ${OBJECTSTORE_ACCESS_KEY}:${signature}`,
      Date: dateValue,
      "Content-Type": contentType,
    };

    try {
      if (file.path && fs.existsSync(file.path)) {
        const fileStream = fs.createReadStream(file.path);
        await axios({
          method: "put",
          url: requestUrl,
          headers: headers,
          data: fileStream,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
      }
    } catch (error) {
      this.logger.error("Error uploading file to object store:", error);
      throw error;
    }
  }

  /**
   * Cleans up tmp directory after file processing
   */
  async cleanUpFiles(): Promise<void> {
    this.logger.debug("Cleaning up temp files");
    const files = await fs.promises.readdir(this.tempDir);
    for (const file of files) {
      const filePath = path.join(this.tempDir, file);
      const stat = await fs.promises.lstat(filePath);
      if (stat.isDirectory()) {
        // Recursively remove directory (for .gdb folders)
        await fs.promises.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(filePath);
      }
    }
  }
}
