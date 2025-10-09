import { ViewEntity, ViewColumn } from "typeorm";

@ViewEntity({ name: "mv_aqi_location_collection" })
export class MvAqiLocationCollection {
  @ViewColumn({ name: "location_id" })
  location_id: string;

  @ViewColumn({ name: "location_name" })
  location_name: string;
}
