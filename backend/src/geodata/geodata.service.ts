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
  constructor() {
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

  @Cron("30 59 21 * * *")
  async processAndUpload(): Promise<void> {
    try {
      const start = Date.now();
      this.logger.debug("Starting sampling location cron job");

      // this.logger.debug("Fetching Sampling Locations");
      // const rawData = await this.fetchSamplingLocations();
      // this.logger.debug("Generating gdb zip and georeferenced csv file");
      // const { csvFile, gdbFile } = await this.transformData(rawData);

      // this.logger.debug("Saving gdb zip and csv file to S3");
      // await this.saveToS3(csvFile);
      // await this.saveToS3(gdbFile);

      // // Clean up generated geojson/gpkg files
      // await this.cleanUpFiles();
      await this.fullTest();

      // Timer logs
      this.logger.debug("Finished sampling location cron job");
      const end = Date.now();
      this.logger.debug(
        `Time Taken: ${Math.floor((end - start) / 60000)} minutes ${Math.floor(((end - start) / 1000) % 60)} seconds`,
      );
    } catch (error) {
      this.logger.error(`Error in processAndUpload: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches all sampling location entries.
   */
  async fetchSamplingLocations(): Promise<any> {
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

    do {
      const url = `${this.baseUrl}${this.samplingLocationsEndpoint}${cursor ? `?limit=1000&cursor=${cursor}` : "?limit=1000"}`;
      // const url = `${baseSUrl + "v1/samplinglocations"}${cursor ? `?limit=100&cursor=${cursor}` : "?limit=100"}`;
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
      // break; // only grab the first 100 for now
    } while (cursor); // Continue only if a cursor is provided

    return allEntries;
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
    this.logger.debug(
      `Fetching summaries complete, time taken: ${Math.floor((Date.now() - start) / 1000)}s`,
    );
    return entries;
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
      // Fetch summaries for all locations
      const summaries = await this.fetchSummaries(rawData);
      // Map summaries by location id for quick lookup
      const summaryMap = new Map();
      if (Array.isArray(summaries)) {
        for (let i = 0; i < summaries.length; i++) {
          const summary = summaries[i];
          // Try to match by id, fallback to index if not present
          const locationId = rawData[i]?.id;
          if (locationId) {
            summaryMap.set(locationId, summary);
          }
        }
      }
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

      // Perform intesect & generate final files
      const { gdbPath, csvPath } =
        await this.intersectAndGenerate(transformedData);

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
   * 1. Receives transformed data from transformData and creates a geojson file
   * 2. Converts geojson into a gpkg
   * 3. Performs intersection between watershed gdb & sampling locations gpkg
   * 4. Generates gdb and csv, returning their paths
   * @param transformedData
   * @returns
   */
  private async intersectAndGenerate(
    transformedData: any,
  ): Promise<{ gdbPath: string; csvPath: string }> {
    const dateString = new Date()
      .toISOString()
      .replaceAll(".", "")
      .replaceAll(":", "")
      .replaceAll("-", "_");
    const watershedGdbPath = path.resolve(
      __dirname,
      "FWA_WATERSHED_GROUPS_POLY.gdb",
    );
    const watershedLayer = "WHSE_BASEMAPPING_FWA_WATERSHED_GROUPS_POLY";
    const vrtPath = path.join(this.tempDir, `watershed_geo_${dateString}.vrt`);
    const gdbPath = path.join(
      this.tempDir,
      `sampling_locations_${dateString}.gdb`,
    );
    const csvPath = path.join(
      this.tempDir,
      `sampling_locations_${dateString}.csv`,
    );

    // Save GeoJSON to temp file
    const geojsonInputPath = path.join(
      this.tempDir,
      `input_${dateString}.geojson`,
    );
    const gpkgInputPath = path.join(this.tempDir, `input_${dateString}.gpkg`);
    const gpkgLayerName = `input_${dateString}`;
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

    const start = Date.now();
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
    const intersectedLayerName = "sampling_locations";
    const intersectedGpkgPath = path.join(
      this.tempDir,
      `output_${dateString}.gpkg`,
    );
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GPKG "${intersectedGpkgPath}" "${vrtPath}" -dialect sqlite -sql "${sql}" -nln ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`Watershed join stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Watershed join failed: ${error.message}`);
      throw error;
    }

    this.logger.debug("Generating GDB");
    // generate gdb from GPKG
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "OpenFileGDB" "${gdbPath}" "${intersectedGpkgPath}" ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`GDB generate stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`GDB generate failed: ${error.message}`);
      throw error;
    }

    this.logger.debug("Generating CSV");
    // generate csv from GPKG
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "CSV" "${csvPath}" "${intersectedGpkgPath}" -lco GEOMETRY=AS_XY`,
      );
      if (stderr) {
        this.logger.warn(`CSV generate stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to convert to CSV: ${error.message}`);
      throw error;
    }
    this.logger.debug(
      `Intersect & file generation complete, time taken: ${Math.floor((Date.now() - start) / 1000)}s`,
    );
    return { gdbPath, csvPath };
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

  async fullTest(): Promise<void> {
    // Fetch Data
    let cursor = "";
    let total = 0;
    let processedCount = 0;
    let entries = [];
    let marchEntries = [];
    let aprilEntries = [];

    axios.defaults.method = "GET";
    axios.defaults.headers.common["Authorization"] =
      "token " + process.env.AUTH_TOKEN;
    axios.defaults.headers.common["x-api-key"] = process.env.AUTH_TOKEN;

    this.logger.log("Getting March entries");
    do {
      const url = `${this.baseUrl}${this.samplingLocationsEndpoint}${cursor ? `?limit=1000&cursor=${cursor}&startModificationTime="2025-03-15T00:00:00.000Z"&endModificationTime="2025-04-15T00:00:00.000Z"` : `?limit=1000&startModificationTime="2025-03-15T00:00:00.000Z"&endModificationTime="2025-04-15T00:00:00.000Z"`}`;
      const response = await axios.get(url);
      if (response.status != 200) {
        return;
      }
      entries = response.data.domainObjects;
      marchEntries = marchEntries.concat(entries);
      cursor = response.data.cursor || null;
      total = response.data.totalCount || 0;
      processedCount += entries.length;
      if (processedCount >= total || (entries.length === 0 && cursor)) {
        break;
      }
    } while (cursor);
    this.logger.log("Total March entries: " + total);
    entries = [];
    cursor = "";
    total = 0;
    processedCount = 0;
    this.logger.log("Getting April entries");
    do {
      const url = `${this.baseUrl}${this.samplingLocationsEndpoint}${cursor ? `?limit=1000&cursor=${cursor}&startModificationTime="2025-04-01T00:00:00.000Z"` : `?limit=1000&startModificationTime="2025-04-01T00:00:00.000Z"`}`;
      const response = await axios.get(url);
      if (response.status != 200) {
        return;
      }
      entries = response.data.domainObjects;
      aprilEntries = aprilEntries.concat(entries);
      cursor = response.data.cursor || null;
      total = response.data.totalCount || 0;
      processedCount += entries.length;
      if (processedCount >= total || (entries.length === 0 && cursor)) {
        break;
      }
    } while (cursor);
    this.logger.log("Total April entries: " + total);

    // Fetch summaries to add to the data
    let marchSummaries = [];
    let aprilSummaries = [];

    axios.defaults.method = "GET";
    axios.defaults.headers.common["Authorization"] =
      "token " + process.env.AUTH_TOKEN;
    axios.defaults.headers.common["x-api-key"] = process.env.AUTH_TOKEN;

    this.logger.log("Getting March summmaries");
    for (let item of marchEntries) {
      const url = `${this.baseUrl}${this.samplingLocationsEndpoint}/${item.id}/summary`;
      try {
        const response = await axios.get(url);
        if (response.status != 200) {
          this.logger.log("bad response status: ", response.status);
          return;
        }
        marchSummaries.push(response.data);
      } catch (err) {
        this.logger.error(err);
      }
    }
    this.logger.log("Getting April summaries");
    for (let item of aprilEntries) {
      const url = `${this.baseUrl}${this.samplingLocationsEndpoint}/${item.id}/summary`;
      const response = await axios.get(url);
      if (response.status != 200) {
        this.logger.log("bad response status: ", response.status);
        return;
      }
      aprilSummaries.push(response.data);
    }

    // Map summaries by location id for quick lookup
    const marchSummaryMap = new Map();
    if (Array.isArray(marchSummaries)) {
      for (let i = 0; i < marchSummaries.length; i++) {
        const summary = marchSummaries[i];
        // Try to match by id, fallback to index if not present
        const locationId = marchEntries[i]?.id;
        if (locationId) {
          marchSummaryMap.set(locationId, summary);
        }
      }
    }
    const aprilSummaryMap = new Map();
    if (Array.isArray(aprilSummaries)) {
      for (let i = 0; i < aprilSummaries.length; i++) {
        const summary = aprilSummaries[i];
        // Try to match by id, fallback to index if not present
        const locationId = aprilEntries[i]?.id;
        if (locationId) {
          aprilSummaryMap.set(locationId, summary);
        }
      }
    }
    // Streamline data into geojson format
    let marchTransformedData = {
      type: "FeatureCollection",
      features: marchEntries.map((location) => {
        const summary = marchSummaryMap.get(location.id) || {};
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
            elevation: (location.elevation && location.elevation.value) || "NA",
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

    let aprilTransformedData = {
      type: "FeatureCollection",
      features: aprilEntries.map((location) => {
        const summary = aprilSummaryMap.get(location.id) || {};
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
            elevation: (location.elevation && location.elevation.value) || "NA",
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

    this.logger.log("Starting file generation");
    // generate march geojson
    const watershedGdbPath = path.resolve(
      __dirname,
      "FWA_WATERSHED_GROUPS_POLY.gdb",
    );
    const watershedLayer = "WHSE_BASEMAPPING_FWA_WATERSHED_GROUPS_POLY";
    const marchvrtPath = path.join(this.tempDir, `watershed_geo_march.vrt`);
    const marchgdbPath = path.join(
      this.tempDir,
      `sampling_locations_march.gdb`,
    );

    // Save GeoJSON to temp file
    const marchgeojsonInputPath = path.join(
      this.tempDir,
      `input_march.geojson`,
    );
    const marchgpkgInputPath = path.join(this.tempDir, `input_march.gpkg`);
    const marchgpkgLayerName = `sampling_locations`;
    const marchjsonString = JSON.stringify(marchTransformedData);
    fs.writeFileSync(marchgeojsonInputPath, marchjsonString, "utf-8");

    // Convert GeoJSON to GPKG
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GPKG \"${marchgpkgInputPath}\" \"${marchgeojsonInputPath}\" -nln ${marchgpkgLayerName}`,
      );
      if (stderr) this.logger.warn(`GPKG conversion warning: ${stderr}`);
    } catch (error) {
      this.logger.error(`Failed to convert to GPKG: ${error.message}`);
      throw error;
    }

    // VRT for GPKG and GDB
    const marchvrtXml = `
      <OGRVRTDataSource>
        <OGRVRTLayer name="${marchgpkgLayerName}">
          <SrcDataSource>${marchgpkgInputPath}</SrcDataSource>
          <SrcLayer>${marchgpkgLayerName}</SrcLayer>
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
    fs.writeFileSync(marchvrtPath, marchvrtXml.trim());

    this.logger.debug("Intesecting data...");
    const marchsql = `
      SELECT
        p.*,
        MIN(w.WATERSHED_GROUP_CODE) AS watershedGroupCode,
        MIN(w.WATERSHED_GROUP_NAME) AS watershedGroupName
      FROM ${marchgpkgLayerName} p
      LEFT JOIN ${watershedLayer} w
      ON ST_Intersects(p.geometry, w.geometry)
      GROUP BY p.id
    `.replace(/\s+/g, " ");

    this.logger.debug("Generating Watershed Intersected GPKG");
    // Generate GPKG as the intersection output
    const intersectedLayerName = "sampling_locations";
    const marchintersectedGpkgPath = path.join(
      this.tempDir,
      `output_march.gpkg`,
    );
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GPKG "${marchintersectedGpkgPath}" "${marchvrtPath}" -dialect sqlite -sql "${marchsql}" -nln ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`Watershed join stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Watershed join failed: ${error.message}`);
      throw error;
    }

    // generate geojson
    const aprilvrtPath = path.join(this.tempDir, `watershed_geo_april.vrt`);
    const aprilgdbPath = path.join(
      this.tempDir,
      `sampling_locations_april.gdb`,
    );

    // Save GeoJSON to temp file
    const aprilgeojsonInputPath = path.join(
      this.tempDir,
      `input_april.geojson`,
    );
    const aprilgpkgInputPath = path.join(this.tempDir, `input_april.gpkg`);
    const aprilgpkgLayerName = `sampling_locations`;
    const apriljsonString = JSON.stringify(aprilTransformedData);
    fs.writeFileSync(aprilgeojsonInputPath, apriljsonString, "utf-8");

    // Convert GeoJSON to GPKG
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GPKG \"${aprilgpkgInputPath}\" \"${aprilgeojsonInputPath}\" -nln ${aprilgpkgLayerName}`,
      );
      if (stderr) this.logger.warn(`GPKG conversion warning: ${stderr}`);
    } catch (error) {
      this.logger.error(`Failed to convert to GPKG: ${error.message}`);
      throw error;
    }

    // VRT for GPKG and GDB
    const aprilvrtXml = `
      <OGRVRTDataSource>
        <OGRVRTLayer name="${aprilgpkgLayerName}">
          <SrcDataSource>${aprilgpkgInputPath}</SrcDataSource>
          <SrcLayer>${aprilgpkgLayerName}</SrcLayer>
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
    fs.writeFileSync(aprilvrtPath, aprilvrtXml.trim());

    const start = Date.now();
    this.logger.debug("Intesecting data...");
    const sql = `
      SELECT
        p.*,
        MIN(w.WATERSHED_GROUP_CODE) AS watershedGroupCode,
        MIN(w.WATERSHED_GROUP_NAME) AS watershedGroupName
      FROM ${aprilgpkgLayerName} p
      LEFT JOIN ${watershedLayer} w
      ON ST_Intersects(p.geometry, w.geometry)
      GROUP BY p.id
    `.replace(/\s+/g, " ");

    this.logger.debug("Generating Watershed Intersected GPKG");
    // Generate GPKG as the intersection output
    const aprilintersectedGpkgPath = path.join(
      this.tempDir,
      `output_april.gpkg`,
    );
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GPKG "${aprilintersectedGpkgPath}" "${aprilvrtPath}" -dialect sqlite -sql "${sql}" -nln ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`Watershed join stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Watershed join failed: ${error.message}`);
      throw error;
    }

    // we have output_april.gpkg and output_march.gpkg, append april onto march and generate a gdb file that should have both datasets

    const combinedGpkgPath = path.join(this.tempDir, `output_combined.gpkg`);
    const finalGdbPath = path.join(
      this.tempDir,
      `sampling_locations_combined.gdb`,
    );

    this.logger.debug("Combining march and april datasets");
    // First, copy march data to the combined GPKG
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GPKG "${combinedGpkgPath}" "${marchintersectedGpkgPath}" -nln ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`Combined GPKG creation stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Combined GPKG creation failed: ${error.message}`);
      throw error;
    }

    // Then upsert april data to the combined GPKG
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GPKG "${combinedGpkgPath}" "${aprilintersectedGpkgPath}" -nln ${intersectedLayerName} -upsert`,
      );
      if (stderr) {
        this.logger.warn(`april data upsert stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`april data upsert failed: ${error.message}`);
      throw error;
    }

    this.logger.debug("Generating combined GDB");
    // Generate GDB from combined GPKG
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "OpenFileGDB" "${finalGdbPath}" "${combinedGpkgPath}" ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`GDB generate stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`GDB generate failed: ${error.message}`);
      throw error;
    }
    // Generate april/march gdbs for testing
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "OpenFileGDB" "/tmp/geodata/march.gdb" "${marchintersectedGpkgPath}" ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`GDB generate stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`GDB generate failed: ${error.message}`);
      throw error;
    }
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "OpenFileGDB" "/tmp/geodata/april.gdb" "${aprilintersectedGpkgPath}" ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`GDB generate stderr: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`GDB generate failed: ${error.message}`);
      throw error;
    }
    this.logger.log("Test complete");
  }
}
