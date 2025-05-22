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
  @Cron("0 12 * * * *")
  async processAndUpload(): Promise<void> {
    try {
      const start = Date.now();
      this.logger.debug("Starting sampling location cron job");

      this.logger.debug("Fetching Sampling Locations");
      const rawData = await this.fetchSamplingLocations();
      this.logger.debug("Generating gdb zip and georeferenced csv file");
      // const { csvFile, gdbFile } = await this.transformData(rawData);
      const { csvFile, gdbFile } = await this.transformData(rawData);

      this.logger.debug("Saving gdb zip and csv file to S3");
      // await this.saveToS3(csvFile);
      // await this.saveToS3(gdbFile);

      this.logger.debug("Cleaning up temp files");
      // Cleanup temporary files
      // fs.unlinkSync(csvFile.path);
      // fs.unlinkSync(gdbFile.path);
      this.logger.debug("Finished sampling location cron job");
      const timeTaken = Date.now() - start;
      const totalSeconds = Math.floor(timeTaken / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      console.log(`Time Taken: ${minutes} minutes ${seconds} seconds`);
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
    let allEntries = [];

    axios.defaults.method = "GET";
    axios.defaults.headers.common["Authorization"] =
      "token " + process.env.AUTH_TOKEN;
    axios.defaults.headers.common["x-api-key"] = process.env.AUTH_TOKEN;

    do {
      // const url = `${baseUrl + "v1/samplinglocations"}${cursor ? `?limit=1000&cursor=${cursor}` : "?limit=1000"}`;
      const url = `${baseUrl + "v1/samplinglocations"}${cursor ? `?limit=1000&cursor=${cursor}` : "?limit=1000"}`;
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
      break;
    } while (cursor); // Continue only if a cursor is provided

    return allEntries;
  }
  // async simplifyObservations(data: any): Promise<any> {
  //   return data.map((obs: any) => ({
  //     id: obs.id,
  //     samplingLocationId: obs.samplingLocation?.id || null,
  //   }));
  // }
  async fetchObservations(): Promise<any> {
    const baseUrl = process.env.BASE_URL_BC_API;
    let cursor = "";
    let total = 0;
    let processedCount = 0;
    let loopCount = 0;
    let entries = [];
    let allEntries = [];
    const route = "v2/observations";

    axios.defaults.method = "GET";
    axios.defaults.headers.common["Authorization"] =
      "token " + process.env.AUTH_TOKEN;
    axios.defaults.headers.common["x-api-key"] = process.env.AUTH_TOKEN;

    do {
      const url = `${baseUrl + route}${cursor ? `?limit=1000&cursor=${cursor}` : "?limit=1000"}`;
      // const url = `${baseUrl + route}${cursor ? `?limit=10&cursor=${cursor}` : "?limit=10"}`;
      const response = await axios.get(url);

      if (response.status != 200) {
        this.logger.error(
          `Could not ping AQI API for ${route}. Response Code: ${response.status}`,
        );
        return;
      }
      entries = response.data.domainObjects;
      allEntries = allEntries.concat(entries);
      cursor = response.data.cursor || null;
      total = response.data.totalCount || 0;

      this.logger.debug(
        `Fetched ${entries.length} entries from ${route}. Processed: ${processedCount}/${total}`,
      );

      // Increment counters
      processedCount += entries.length;
      loopCount++;

      if (loopCount % 5 === 0 || processedCount >= total) {
        this.logger.debug(`Progress: ${processedCount}/${total}`);
      }

      // Break if we've processed all expected entries
      if (processedCount >= total) {
        this.logger.debug(`Completed fetching data for ${route}`);
        break;
      }

      // Edge case: Break if no entries are returned but the cursor is still valid
      if (entries.length === 0 && cursor) {
        this.logger.warn(
          `Empty response for ${route} with cursor ${cursor}. Terminating early.`,
        );
        break;
      }
      // break;
    } while (cursor); // Continue only if a cursor is provided
    // allEntries = await this.simplifyObservations(allEntries);
    return allEntries.map((obs: any) => ({
      id: obs.id,
      samplingLocationId: obs.samplingLocation?.id || null,
    }));
  }

  // async simplifyFieldVisits(data: any): Promise<any> {
  //   return data.map((fv: any) => ({
  //     id: fv.id,
  //     samplingLocationId: fv.samplingLocation?.id || null,
  //     visitDate: fv.startTime,
  //   }));
  // }
  async fetchFieldVisits(): Promise<any> {
    const baseUrl = process.env.BASE_URL_BC_API;
    let cursor = "";
    let total = 0;
    let processedCount = 0;
    let loopCount = 0;
    let entries = [];
    let allEntries = [];
    const route = "v1/fieldvisits";

    axios.defaults.method = "GET";
    axios.defaults.headers.common["Authorization"] =
      "token " + process.env.AUTH_TOKEN;
    axios.defaults.headers.common["x-api-key"] = process.env.AUTH_TOKEN;

    do {
      const url = `${baseUrl + route}${cursor ? `?limit=1000&cursor=${cursor}` : "?limit=1000"}`;
      // const url = `${baseUrl + route}${cursor ? `?limit=10&cursor=${cursor}` : "?limit=10"}`;
      const response = await axios.get(url);

      if (response.status != 200) {
        this.logger.error(
          `Could not ping AQI API for ${route}. Response Code: ${response.status}`,
        );
        return;
      }
      entries = response.data.domainObjects;
      allEntries = allEntries.concat(entries);
      cursor = response.data.cursor || null;
      total = response.data.totalCount || 0;

      this.logger.debug(
        `Fetched ${entries.length} entries from ${route}. Processed: ${processedCount}/${total}`,
      );

      // Increment counters
      processedCount += entries.length;
      loopCount++;

      if (loopCount % 5 === 0 || processedCount >= total) {
        this.logger.debug(`Progress: ${processedCount}/${total}`);
      }

      // Break if we've processed all expected entries
      if (processedCount >= total) {
        this.logger.debug(`Completed fetching data for ${route}`);
        break;
      }

      // Edge case: Break if no entries are returned but the cursor is still valid
      if (entries.length === 0 && cursor) {
        this.logger.warn(
          `Empty response for ${route} with cursor ${cursor}. Terminating early.`,
        );
        break;
      }
    } while (cursor); // Continue only if a cursor is provided
    // allEntries = await this.simplifyFieldVisits(allEntries);
    return allEntries.map((fv: any) => ({
      id: fv.id,
      samplingLocationId: fv.samplingLocation?.id || null,
      visitDate: fv.startTime,
    }));
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

  async updateLocationData(transformedData: any): Promise<any> {
    const simpleObs = await this.fetchObservations();
    const simpleFv = await this.fetchFieldVisits();

    // Map field visits by samplingLocationId for quick lookup
    const fvByLoc: Record<string, { visitDate: string }[]> = {};
    for (const fv of simpleFv) {
      if (!fvByLoc[fv.samplingLocationId]) fvByLoc[fv.samplingLocationId] = [];
      fvByLoc[fv.samplingLocationId].push(fv);
    }

    // Map observations by samplingLocationId for quick lookup
    const obsByLoc: Record<string, number> = {};
    for (const obs of simpleObs) {
      if (!obsByLoc[obs.samplingLocationId])
        obsByLoc[obs.samplingLocationId] = 0;
      obsByLoc[obs.samplingLocationId]++;
    }

    for (const feature of transformedData.features) {
      const locId = feature.properties.id;
      // Observations
      feature.properties.numberOfObservations = obsByLoc[locId] || 0;
      // Field Visits
      const visits = fvByLoc[locId] || [];
      feature.properties.numberOfFieldVisits = visits.length;
      if (visits.length > 0) {
        const dates = visits
          .map((v) => v.visitDate)
          .filter(Boolean)
          .sort();
        feature.properties.earliestFieldVisit = dates[0] || null;
        feature.properties.mostRecentFieldVisit =
          dates[dates.length - 1] || null;
      } else {
        feature.properties.earliestFieldVisit = null;
        feature.properties.mostRecentFieldVisit = null;
      }
    }
    return transformedData;
  }

  async fetchSummaries(rawData: any): Promise<any> {
    const baseUrl = process.env.BASE_URL_BC_API;
    const route = "v1/samplinglocations/";
    const entries = [];

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
    }
    console.log(entries.length);
    console.log(`Time taken: ${Math.floor((Date.now() - start) / 1000)}s`);
    return entries;
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
      console.log("fetching summaries");
      await this.fetchSummaries(rawData);
      // transformedData = await this.updateLocationData(transformedData);

      // const simpleObs = await this.fetchObservations();
      // const simpleFv = await this.fetchFieldVisits();

      // const rawObsPath = path.join(this.tempDir, "rawObs.json");
      // const rawFvPath = path.join(this.tempDir, "rawFv.json");
      // const obsJsonString = JSON.stringify(rawObs, null, 2);
      // const fvJsonString = JSON.stringify(rawFv, null, 2);
      // fs.writeFileSync(rawObsPath, obsJsonString, "utf-8");
      // fs.writeFileSync(rawFvPath, fvJsonString, "utf-8");

      const dateString = new Date()
        .toISOString()
        .replaceAll(".", "")
        .replaceAll(":", "")
        .replaceAll("-", "_");

      // Save GeoJSON to temp file
      const geojsonInputPath = path.join(
        this.tempDir,
        `input_${dateString}.geojson`,
      );
      const jsonString = JSON.stringify(transformedData);
      console.log(jsonString.length);
      console.log("Writing GeoJSON file.");
      fs.writeFileSync(geojsonInputPath, jsonString, "utf-8");
      console.log("GeoJSON file written.");
      const { gdbPath, csvPath, outputPath } = await this.intersectAndGenerate(
        geojsonInputPath,
        dateString,
      );

      // Convert to GDB (creates a directory)
      // const gdbPath = await this.convertToGdb(geojsonPath, dateString);

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
      // const csvPath = await this.convertToCsv(geojsonPath, dateString);

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

      //// Clean up generated geojson files
      // fs.unlinkSync(geojsonPath);
      // fs.unlinkSync(outputPath);

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

  // private async convertToGdb(
  //   geojsonPath: string,
  //   dateString: string,
  // ): Promise<string> {
  //   const gdbPath = path.join(this.tempDir, `output_${dateString}.gdb`);

  //   try {
  //     const { stdout, stderr } = await this.execAsync(
  //       `ogr2ogr -f "OpenFileGDB" "${gdbPath}" "${geojsonPath}"`,
  //     );
  //     if (stderr) {
  //       this.logger.warn(`GDB conversion warning: ${stderr}`);
  //     }
  //     return gdbPath;
  //   } catch (error) {
  //     this.logger.error(`Failed to convert to GDB: ${error.message}`);
  //     throw error;
  //   }
  // }

  // private async convertToCsv(
  //   geojsonPath: string,
  //   dateString: string,
  // ): Promise<string> {
  //   const csvPath = path.join(
  //     this.tempDir,
  //     `samplinglocations-${dateString}.csv`,
  //   );
  //   try {
  //     const { stdout, stderr } = await this.execAsync(
  //       `ogr2ogr -f "CSV" "${csvPath}" "${geojsonPath}" -lco GEOMETRY=AS_XY`,
  //     );
  //     if (stderr) {
  //       this.logger.warn(`CSV conversion warning: ${stderr}`);
  //     }
  //     return csvPath;
  //   } catch (error) {
  //     this.logger.error(`Failed to convert to CSV: ${error.message}`);
  //     throw error;
  //   }
  // }

  private async intersectAndGenerate(
    geojsonInputPath: string,
    dateString: string,
  ): Promise<{ gdbPath: string; csvPath: string; outputPath: string }> {
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
    const outputPath = path.join(this.tempDir, `output_${dateString}.geojson`);
    const geojsonInputLayerName = `input_${dateString}`;

    const vrtXml = `
      <OGRVRTDataSource>
        <OGRVRTLayer name="${geojsonInputLayerName}">
          <SrcDataSource>${geojsonInputPath}</SrcDataSource>
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

    this.logger.log("Intesecting");
    const sql = `
      SELECT
        p.*,
        MIN(w.WATERSHED_GROUP_CODE) AS watershedGroupCode,
        MIN(w.WATERSHED_GROUP_NAME) AS watershedGroupName
      FROM ${geojsonInputLayerName} p
      LEFT JOIN ${watershedLayer} w
      ON ST_Intersects(p.geometry, w.geometry)
      GROUP BY p.id
    `.replace(/\s+/g, " ");

    this.logger.log("Generating Watershed Intersected GeoJSON");
    // generate GeoJSON
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f GeoJSON "${outputPath}" "${vrtPath}" -dialect sqlite -sql "${sql}"`,
      );
      if (stderr) this.logger.warn(`Watershed join stderr: ${stderr}`);
      // const joined = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      // return joined.features;
    } catch (error) {
      this.logger.error(`Watershed join failed: ${error.message}`);
      throw error;
    }

    // const ogrCmd = `ogr2ogr -f GeoJSON "${outputPath}" "${vrtPath}" -dialect sqlite -sql "${sql}"`;
    this.logger.log("Generating GDB");
    // generate gdb
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "OpenFileGDB" "${gdbPath}" "${outputPath}"`,
      );
      if (stderr) this.logger.warn(`GDB generate stderr: ${stderr}`);
      // const joined = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      // return joined.features;
    } catch (error) {
      this.logger.error(`Watershed join failed: ${error.message}`);
      throw error;
    }

    this.logger.log("Generating CSV");
    // generate csv
    try {
      const { stdout, stderr } = await this.execAsync(
        `ogr2ogr -f "CSV" "${csvPath}" "${outputPath}" -lco GEOMETRY=AS_XY`,
      );
      if (stderr) {
        this.logger.warn(`CSV generate stderr: ${stderr}`);
      }
    } catch (error) {
      this.logger.error(`Failed to convert to CSV: ${error.message}`);
      throw error;
    }
    return { gdbPath, csvPath, outputPath };
  }
}
