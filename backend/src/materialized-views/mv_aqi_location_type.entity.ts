import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'mv_aqi_locationtype',
})
export class MvAqiLocationType {
  @ViewColumn()
  locationtype: string;
}
