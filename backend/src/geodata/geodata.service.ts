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
  private readonly samplingLocationGroupsEndpoint =
    process.env.SAMPLING_LOCATION_GROUPS_ENDPOINT;

  @Cron("40 15 16 * * *")
  async processAndUpload(): Promise<void> {
    try {
      this.logger.debug("Starting sampling location cron job");
      const start = Date.now();
      // Used for file names & datebase timestamp
      const newDate = new Date();
      const timestamp = newDate
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
      // Fetch latest gpkg from S3
      const { latestFilePath, latestDateCreated } =
        await this.fetchLatestGpkg();
      // Fetch data that has been uploaded since the last run
      const rawData = await this.fetchSamplingLocations(latestDateCreated);
      // Transform the raw data to geojson format
      const newGpkgPath = await this.generateSamplingLocationGpkg(
        rawData,
        timestamp,
      );
      // Perform intersections & write the files locally
      const { gdbPath, csvPath, gpkgPath, geoJsonPath } =
        await this.intersectAndGenerate({
          timestamp: timestamp,
          newGpkgPath: newGpkgPath,
          latestFilePath: latestFilePath,
          intersectedLayerName: "sampling_locations",
        });

      // Upload the files to S3
      await this.uploadFiles(gdbPath, csvPath, gpkgPath);

      // Save a file info entry into the database
      await this.saveNewFileInfo(path.basename(gpkgPath), newDate);

      const samplingLocationGroupGpkgPath =
        await this.generateSamplingLocationGroupGpkg(timestamp, geoJsonPath);
      this.logger.debug("samplingLocationGroupGpkgPath");
      this.logger.debug(samplingLocationGroupGpkgPath);
      const { locationGroupGdbPath, locationGroupCsvPath } =
        await this.generateLocationGroupGdbCsv(
          timestamp,
          samplingLocationGroupGpkgPath,
        );
      await this.uploadFiles(
        locationGroupGdbPath,
        locationGroupCsvPath,
        samplingLocationGroupGpkgPath,
      );

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
    latestFilePath: string | null;
    latestDateCreated: Date | null;
  }> {
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
      );
      return { latestFilePath: null, latestDateCreated: null };
    }

    if (!latestFileInfo) {
      this.logger.warn("No file information found in the database.");
      return { latestFilePath: null, latestDateCreated: null };
    }

    const fileName = latestFileInfo.file_name;
    if (!fileName) {
      this.logger.error(
        `File information found (ID: ${latestFileInfo.id}), but file_name is missing.`,
      );
      return { latestFilePath: null, latestDateCreated: null };
    }
    this.logger.debug(`Latest file to fetch from S3: ${fileName}`);

    // Debug: List all files in the S3 bucket
    // await this.listS3BucketContents();

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
      return { latestFilePath: null, latestDateCreated: null };
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
        return { latestFilePath: null, latestDateCreated: null };
      }
      this.logger.debug(`Successfully fetched ${fileName} from S3.`);
    } catch (error) {
      this.logger.error(
        `Error fetching file ${fileName} from S3: ${error.message}`,
      );
      return { latestFilePath: null, latestDateCreated: null };
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
      );
      return { latestFilePath: null, latestDateCreated: null };
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
      // break;
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
   * Fetches all sampling location group entries.
   */
  async fetchSamplingLocationGroups(): Promise<any> {
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

    this.logger.debug("Fetching sampling location groups...");
    const start = Date.now();
    do {
      const url = `${this.baseUrl}${this.samplingLocationGroupsEndpoint}`;
      const response = await axios.get(url);

      if (response.status != 200) {
        this.logger.error(
          `Could not ping AQI API for /v1/samplinglocationgroups. Response Code: ${response.status}`,
        );
        return;
      }
      entries = response.data.domainObjects;
      allEntries = allEntries.concat(entries);
      cursor = response.data.cursor || null;
      total = response.data.totalCount || 0;

      // Logging
      this.logger.debug(
        `Fetched ${entries.length} entries from /v1/samplinglocationgroups. Processed: ${processedCount}/${total}`,
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
          `Empty response for /v1/samplinglocationgroups with cursor ${cursor}. Terminating early.`,
        );
        break;
      }
    } while (cursor); // Continue only if a cursor is provided
    const end = Date.now();
    this.logger.debug(
      `Fetching sampling location groups complete, time taken: ${Math.floor((end - start) / 3600000)} hours, ${Math.floor(((end - start) / 60000) % 60)} minutes ${Math.floor(((end - start) / 1000) % 60)} seconds`,
    );
    return allEntries;
  }

  /**
   * Helper function to grab extended attribute values
   */
  getExtendedAttributeValue(extendedAttributes: any[], attributeId: string) {
    const attribute = extendedAttributes.find(
      (attr) => attr.attributeId === attributeId,
    );
    return attribute ? attribute.text : "";
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
  async generateSamplingLocationGpkg(rawData: any, timestamp: string) {
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
              id: location.customId || "",
              name: location.name || "",
              comments: location.description || "",
              locationGroupNames: location.samplingLocationGroups
                ? location.samplingLocationGroups
                    .map((group) => group.name || "")
                    .join("; ")
                : "",
              locationType: (location.type && location.type.customId) || "",
              elevation: (location.elevation && location.elevation.value) || "",
              elevationUnit:
                (location.elevation &&
                  location.elevation.unit &&
                  location.elevation.unit.customId) ||
                "",
              horizontalCollectionMethod:
                location.horizontalCollectionMethod || "",
              observationCount: summary.observationCount,
              fieldVisitCount: summary.fieldVisitCount,
              latestFieldVisit:
                (summary.latestFieldVisit &&
                  summary.latestFieldVisit.startTime) ||
                "",
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
              // Add original geographic coordinates as attributes
              longitude: location.longitude
                ? parseFloat(location.longitude)
                : null,
              latitude: location.latitude
                ? parseFloat(location.latitude)
                : null,
            },
          };
        }),
      };

      // Generate a geojson and then convert it to gpkg
      this.logger.log(
        "transformedData.features.length: " + transformedData.features.length,
      );
      if (transformedData.features.length > 0) {
        this.logger.log("Generating new data geojson");
        const geojsonPath = path.join(
          this.tempDir,
          `input_${timestamp}.geojson`,
        );
        const gpkgPath = path.join(this.tempDir, `input_${timestamp}.gpkg`);
        const intersectedLayerName = "sampling_locations";

        // Save GeoJSON
        const jsonString = JSON.stringify(transformedData);
        fs.writeFileSync(geojsonPath, jsonString, "utf-8");

        this.logger.log("Generating new data GPKG");
        // Save GPKG
        const { stdout, stderr } = await this.execAsync(
          `ogr2ogr -f GPKG \"${gpkgPath}\" \"${geojsonPath}\" -nln ${intersectedLayerName} -s_srs EPSG:4326 -t_srs EPSG:3005 -lco SPATIAL_INDEX=YES`,
        );
        if (stderr) this.logger.warn(`GPKG conversion warning: ${stderr}`);
        this.logger.log(
          "Successfully generated new data GPKG, returning the path",
        );
        return gpkgPath;
      }
    } catch (error) {
      console.error("Error during geojson generation:", error);
    }
    return null;
  }

  async generateSamplingLocationGroupGpkg(
    timestamp: string,
    samplingLocationGeojsonPath: string,
  ) {
    try {
      // Fetch group metadata
      const rawSamplingLocationGroups =
        await this.fetchSamplingLocationGroups();
      const groupMap = new Map<string, any>();
      rawSamplingLocationGroups.forEach((group) =>
        groupMap.set(group.name, group),
      );

      // Read sampling location geojson
      const content = fs.readFileSync(samplingLocationGeojsonPath, "utf-8");
      const samplingGeojson = JSON.parse(content);

      // Build new GeoJSON for groups
      const transformedData: any = { type: "FeatureCollection", features: [] };
      samplingGeojson.features.forEach((feature: any) => {
        const names = (feature.properties.locationGroupNames || "")
          .split(";")
          .map((s: string) => s.trim())
          .filter(Boolean);
        names.forEach((name) => {
          const group = groupMap.get(name);
          if (group) {
            transformedData.features.push({
              type: "Feature",
              geometry: feature.geometry,
              properties: {
                locationId: feature.properties.id,
                locationName: feature.properties.name,
                watershedGroupCode: feature.properties.watershedGroupCode,
                watershedGroupName: feature.properties.watershedGroupName,
                groupName: group.name,
                groupDescription: group.description || "",
                groupType: group.locationGroupType?.customId || "",
                latitude: feature.properties.latitude || "",
                longitude: feature.properties.longitude || "",
              },
            });
          } else {
            this.logger.warn(`Group metadata not found for: ${name}`);
          }
        });
      });

      if (transformedData.features.length > 0) {
        // Write GeoJSON to disk
        const geojsonPath = path.join(
          this.tempDir,
          `location_groups_${timestamp}.geojson`,
        );
        const gpkgPath = path.join(
          this.tempDir,
          `location_groups_${timestamp}.gpkg`,
        );
        fs.writeFileSync(geojsonPath, JSON.stringify(transformedData), "utf-8");
        // Convert to GPKG
        this.logger.log(
          `Generating sampling location group GPKG from ${geojsonPath}`,
        );
        const { stdout, stderr } = await this.execAsync(
          `ogr2ogr -f GPKG "${gpkgPath}" "${geojsonPath}" -nln location_groups -s_srs EPSG:3005 -t_srs EPSG:3005 -lco SPATIAL_INDEX=YES`,
        );
        if (stderr)
          this.logger.warn(
            `Sampling location group GPKG conversion warning: ${stderr}`,
          );
        this.logger.log(`Successfully generated sampling location group GPKG`);
        return gpkgPath;
      } else {
        this.logger.warn("No sampling location group features to generate.");
      }
    } catch (error) {
      this.logger.error(
        "Error generating sampling location group GPKG:",
        error,
      );
    }
    return null;
  }

  private async generateLocationGroupGdbCsv(
    timestamp: string,
    samplingLocationGroupGpkgPath: string,
  ): Promise<{ locationGroupGdbPath: string; locationGroupCsvPath: string }> {
    this.logger.debug("Generating location group GDB and CSV");

    // Define output file paths
    const locationGroupGdbPath = path.join(
      this.tempDir,
      `location_groups_${timestamp}.gdb`,
    );
    const locationGroupCsvPath = path.join(
      this.tempDir,
      `location_groups_${timestamp}.csv`,
    );

    // Layer name in the GPKG
    const layerName = "location_groups";

    // Generate GDB from GPKG
    this.logger.debug("Generating location group GDB");
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "OpenFileGDB" "${locationGroupGdbPath}" "${samplingLocationGroupGpkgPath}" ${layerName}`,
      );
      if (stderr) {
        this.logger.warn(`Location group GDB generation warning: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Location group GDB generation failed: ${error.message}`,
      );
      throw error;
    }

    // Generate CSV from GPKG
    this.logger.debug("Generating location group CSV");
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "CSV" -lco GEOMETRY=AS_XY "${locationGroupCsvPath}" "${samplingLocationGroupGpkgPath}" ${layerName}`,
      );
      if (stderr) {
        this.logger.warn(`Location group CSV generation warning: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Location group CSV generation failed: ${error.message}`,
      );
      throw error;
    }

    this.logger.debug("Location group GDB and CSV generation complete");
    return { locationGroupGdbPath, locationGroupCsvPath };
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
  private async intersectAndGenerate(params: {
    timestamp: string;
    newGpkgPath?: string;
    latestFilePath?: string;
    intersectedLayerName?: string;
  }): Promise<{
    gdbPath: string;
    csvPath: string;
    gpkgPath: string;
    geoJsonPath: string;
  }> {
    const start = Date.now();

    const { timestamp, newGpkgPath, latestFilePath, intersectedLayerName } =
      params;

    // Watershed GDB variables
    const watershedGdbPath = path.resolve(
      __dirname,
      "FWA_WATERSHED_GROUPS_POLY.gdb",
    );
    const watershedLayer = "WHSE_BASEMAPPING_FWA_WATERSHED_GROUPS_POLY";

    // Layer name
    // const intersectedLayerName = "sampling_locations";

    // new transformed data gpkg path after intersection
    const gpkgOutputPath = path.join(
      this.tempDir,
      `intersect_${timestamp}.gpkg`,
    );
    // final combined gpkg data path
    const gpkgPath = path.join(
      this.tempDir,
      `sampling_locations_${timestamp}.gpkg`,
    );
    // vrt file path, used for intersecting the watershed gdb with the transformed data gpkg
    const vrtPath = path.join(this.tempDir, `watershed_geo_${timestamp}.vrt`);
    // gdb file path
    const gdbPath = path.join(
      this.tempDir,
      `sampling_locations_${timestamp}.gdb`,
    );
    // csv file path
    const csvPath = path.join(
      this.tempDir,
      `sampling_locations_${timestamp}.csv`,
    );
    // intersected geoJson path
    const geoJsonPath = path.join(
      this.tempDir,
      `sampling_locations_${timestamp}.geojson`,
    );

    // New data & previously generated file, UPSERT new data into old
    if (newGpkgPath && latestFilePath) {
      this.logger.debug(`Found new data and previously generated file`);
      // VRT for new GPKG and watershed GDB
      const vrtXml = `
      <OGRVRTDataSource>
        <OGRVRTLayer name="${intersectedLayerName}">
          <SrcDataSource>${newGpkgPath}</SrcDataSource>
          <SrcLayer>${intersectedLayerName}</SrcLayer>
          <GeometryType>wkbPoint</GeometryType>
          <LayerSRS>EPSG:3005</LayerSRS>
        </OGRVRTLayer>
        <OGRVRTLayer name="${watershedLayer}">
          <SrcDataSource>${watershedGdbPath}</SrcDataSource>
          <SrcLayer>${watershedLayer}</SrcLayer>
          <GeometryType>wkbPolygon</GeometryType>
          <LayerSRS>EPSG:3005</LayerSRS>
        </OGRVRTLayer>
      </OGRVRTDataSource>`;
      fs.writeFileSync(vrtPath, vrtXml.trim());

      this.logger.debug("Intesecting data...");
      const sql = `
      SELECT
        p.*,
        MIN(w.WATERSHED_GROUP_CODE) AS watershedGroupCode,
        MIN(w.WATERSHED_GROUP_NAME) AS watershedGroupName
      FROM ${intersectedLayerName} p
      LEFT JOIN ${watershedLayer} w
      ON ST_Intersects(p.geometry, w.geometry)
      GROUP BY p.id
    `.replace(/\s+/g, " ");

      this.logger.debug("Generating Watershed Intersected GPKG");

      // New Intersected GPKG
      try {
        const { stdout, stderr } = await this.execAsync(
          `ogr2ogr -f GPKG "${gpkgOutputPath}" "${vrtPath}" -dialect sqlite -sql "${sql}" -nln ${intersectedLayerName} -lco SPATIAL_INDEX=YES`,
        );
        if (stderr) {
          this.logger.warn(`Watershed join stderr: ${stderr}`);
        }
      } catch (error: any) {
        this.logger.error(`Watershed join failed: ${error.message}`);
        throw error;
      }

      // Copy the old GPKG to the output GPKG
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

      // Upsert the new intersected GPKG into the output GPKG
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
    // No previously generated file (skip upsert)
    else if (newGpkgPath && !latestFilePath) {
      this.logger.debug(`No previously generated file, skipping upsert`);
      // VRT for new GPKG and watershed GDB
      const vrtXml = `
      <OGRVRTDataSource>
        <OGRVRTLayer name="${intersectedLayerName}">
          <SrcDataSource>${newGpkgPath}</SrcDataSource>
          <SrcLayer>${intersectedLayerName}</SrcLayer>
          <GeometryType>wkbPoint</GeometryType>
          <LayerSRS>EPSG:3005</LayerSRS>
        </OGRVRTLayer>
        <OGRVRTLayer name="${watershedLayer}">
          <SrcDataSource>/app/dist/geodata/watersheds_3005.gpkg</SrcDataSource>
          <SrcLayer>${watershedLayer}</SrcLayer>
          <GeometryType>wkbPolygon</GeometryType>
          <LayerSRS>EPSG:3005</LayerSRS>
        </OGRVRTLayer>
      </OGRVRTDataSource>`;
      fs.writeFileSync(vrtPath, vrtXml.trim());

      this.logger.debug("Intesecting data...");
      const sql = `
      SELECT
        p.*,
        MIN(w.WATERSHED_GROUP_CODE) AS watershedGroupCode,
        MIN(w.WATERSHED_GROUP_NAME) AS watershedGroupName
      FROM ${intersectedLayerName} p
      LEFT JOIN ${watershedLayer} w
      ON ST_Intersects(p.geometry, w.geometry)
      GROUP BY p.id
    `.replace(/\s+/g, " ");

      this.logger.debug("Generating Watershed Intersected GPKG");

      // New Intersected GPKG, copy directly into output GPKG
      try {
        const { stdout, stderr } = await this.execAsync(
          `ogr2ogr -f GPKG "${gpkgPath}" "${vrtPath}" -dialect sqlite -sql "${sql}" -nln ${intersectedLayerName} -lco SPATIAL_INDEX=YES`,
        );
        if (stderr) {
          this.logger.warn(`Watershed join stderr: ${stderr}`);
        }
      } catch (error: any) {
        this.logger.error(`Watershed join failed: ${error.message}`);
        throw error;
      }
    }
    // No new data (skip intersect & upsert)
    else if (!newGpkgPath && latestFilePath) {
      this.logger.debug(`No new data, skipping intersect and upsert`);
      // Copy the old GPKG to the output GPKG
      try {
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
    }
    // No new data & no previously generated file
    else {
      // this will never happen
      this.logger.debug(
        "No new and no previously generated file (something went wrong)",
      );
    }
    this.logger.debug("GPKG generation was successful");

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
        `ogr2ogr -f "CSV" -lco GEOMETRY=AS_XY "${csvPath}" "${gpkgPath}" ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`Failed to convert to CSV warning: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to convert to CSV: ${error.message}`);
      throw error;
    }

    this.logger.debug("Generating geojson");
    // sampling location geojson used in generateSamplingLocationGroupGpkg
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "GeoJSON" "${geoJsonPath}" "${gpkgPath}" ${intersectedLayerName}`,
      );
      if (stderr) {
        this.logger.warn(`Failed to convert to GeoJSON warning: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to convert to GeoJSON: ${error.message}`);
      throw error;
    }
    const end = Date.now();
    this.logger.debug(
      `Intersect & file generation complete, time taken: ${Math.floor((end - start) / 3600000)} hours, ${Math.floor(((end - start) / 60000) % 60)} minutes ${Math.floor(((end - start) / 1000) % 60)} seconds`,
    );

    // return file paths
    return { gdbPath, csvPath, gpkgPath, geoJsonPath };
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
    const objectPath = `${OBJECTSTORE_FOLDER}/${fileName}`;
    const canonicalizedResource = `/${OBJECTSTORE_BUCKET}/${objectPath}`;
    const requestUrl = `${OBJECTSTORE_URL}/${OBJECTSTORE_BUCKET}/${objectPath}`;

    const signature = crypto
      .createHmac("sha1", OBJECTSTORE_SECRET_KEY)
      .update(`PUT\n\n${contentType}\n${dateValue}\n${canonicalizedResource}`)
      .digest("base64");

    // Get file size for Content-Length header
    const stats = fs.statSync(file.path);
    const fileSize = stats.size;

    const headers = {
      Authorization: `AWS ${OBJECTSTORE_ACCESS_KEY}:${signature}`,
      Date: dateValue,
      "Content-Type": contentType,
      "Content-Length": fileSize,
      Host: new URL(OBJECTSTORE_URL).host,
    };

    try {
      if (file.path && fs.existsSync(file.path)) {
        const fileStream = fs.createReadStream(file.path);
        const response = await axios({
          method: "put",
          url: requestUrl,
          headers: headers,
          data: fileStream,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          validateStatus: () => true,
        });

        if (response.status !== 200 && response.status !== 201) {
          this.logger.error(
            `Failed to upload file. Status: ${response.status}`,
          );
          throw new Error(`File upload failed with status ${response.status}`);
        }

        return true;
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

  /**
   * Debug method to list all files in the S3 bucket
   */
  private async listS3BucketContents(): Promise<void> {
    const OBJECTSTORE_URL = process.env.OBJECTSTORE_URL;
    const OBJECTSTORE_ACCESS_KEY2 = process.env.OBJECTSTORE_ACCESS_KEY2;
    const OBJECTSTORE_SECRET_KEY2 = process.env.OBJECTSTORE_SECRET_KEY2;
    const OBJECTSTORE_BUCKET2 = process.env.OBJECTSTORE_BUCKET2;
    const OBJECTSTORE_FOLDER = process.env.OBJECTSTORE_FOLDER;

    if (
      !OBJECTSTORE_URL ||
      !OBJECTSTORE_ACCESS_KEY2 ||
      !OBJECTSTORE_SECRET_KEY2 ||
      !OBJECTSTORE_BUCKET2 ||
      !OBJECTSTORE_FOLDER
    ) {
      this.logger.error(
        "S3 object store configuration is incomplete. Cannot list bucket contents.",
      );
      return;
    }

    const dateValue = new Date().toUTCString();
    const stringToSign = `GET\n\n\n${dateValue}\n/${OBJECTSTORE_BUCKET2}/${OBJECTSTORE_FOLDER}/`;

    const signature = crypto
      .createHmac("sha1", OBJECTSTORE_SECRET_KEY2)
      .update(stringToSign)
      .digest("base64");

    const requestUrl = `${OBJECTSTORE_URL}/${OBJECTSTORE_BUCKET2}/${OBJECTSTORE_FOLDER}/`;

    const headers = {
      Authorization: `AWS ${OBJECTSTORE_ACCESS_KEY2}:${signature}`,
      Date: dateValue,
    };

    try {
      this.logger.debug(`Listing S3 bucket contents at: ${requestUrl}`);
      const response = await axios({
        method: "get",
        url: requestUrl,
        headers: headers,
      });

      if (response.status === 200) {
        this.logger.debug(
          `S3 bucket listing response: ${JSON.stringify(response.data, null, 2)}`,
        );
      } else {
        this.logger.error(
          `Failed to list S3 bucket contents. Status: ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error listing S3 bucket contents: ${error.message}`);
    }
  }
}
