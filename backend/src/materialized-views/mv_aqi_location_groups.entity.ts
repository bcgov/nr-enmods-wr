import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'mv_aqi_location_groups',
})
export class MvAqiLocationGroups {
  @ViewColumn()
  location_groups: string;
}
