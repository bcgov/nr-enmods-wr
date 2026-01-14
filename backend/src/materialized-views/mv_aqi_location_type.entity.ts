import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'mv_aqi_location_type',
})
export class MvAqiLocationType {
  @ViewColumn()
  location_type: string;
}
