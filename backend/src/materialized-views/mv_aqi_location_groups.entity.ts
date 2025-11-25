import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'mv_aqi_location_group',
})
export class MvAqiLocationGroup {
  @ViewColumn()
  location_group: string;
}
