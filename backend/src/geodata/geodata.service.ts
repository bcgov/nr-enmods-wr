import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import axios from "axios";
import * as crypto from "crypto";

// If these IDs are not consistent across environments, we will need to fetch them instead.
const EXTENDED_ATTRIBUTES = {
  closedDate: "26cd4bdd-2bd3-43fa-a37b-3edeabb2a4be",
  establishedDate: "e6d3f5b3-ccdf-4c8b-aa4e-a8a783d2db01",
  wellTagNumber: "7ff9bea7-fc37-4c77-9c4e-fb790f5c7e3e",
};

@Injectable()
export class GeodataService {
  private readonly logger = new Logger("GeodataService");

  // Run at midnight
  // @Cron("0 0 0 * * *")
  @Cron("30 * * * * *")
  async processAndUpload(): Promise<void> {
    this.logger.log("Starting sampling location cron job.");
    const rawData = await this.fetchSamplingLocations();
    const transformedDataFile = this.transformData(rawData);
    await this.saveToS3(transformedDataFile);
    this.logger.log("Finished sampling location cron job.");
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

      this.logger.log(
        `Fetched ${entries.length} entries from /v1/samplinglocations. Processed: ${processedCount}/${total}`,
      );

      // Increment counters
      processedCount += entries.length;
      loopCount++;
      // Log progress periodically
      if (loopCount % 5 === 0 || processedCount >= total) {
        this.logger.log(`Progress: ${processedCount}/${total}`);
      }

      // Break if we've processed all expected entries
      if (processedCount >= total) {
        this.logger.log(`Completed fetching data for /v1/samplinglocations`);
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
   * Takes the raw data from aqi and simplifies it, converts it to file buffer
   * @param rawData
   * @returns
   */ transformData(rawData: any) {
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
            // We need to get this somehow
            watershedGroupName: null,
            watershedGroupCode: null,
            elevation: location.elevation?.value || null,
            elevationUnit: location.elevation?.unit?.customId || null,
            horizontalCollectionMethod: location.horizontalCollectionMethod,
            // These fields do not seem to be a part of the sampling locations api
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
      const jsonString = JSON.stringify(transformedData, null, 2); // formats the file nicely but increases the size by 60%
      const buffer = Buffer.from(jsonString, "utf-8");
      const dateString = new Date()
        .toISOString()
        .replaceAll(".", "")
        .replaceAll(":", "");
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: `samplinglocations-${dateString}.geojson`,
        encoding: "7bit",
        mimetype: "application/geo+json",
        buffer: buffer,
        size: buffer.length,
        stream: null,
        destination: null,
        filename: null,
        path: null,
      };

      return file;
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
}
