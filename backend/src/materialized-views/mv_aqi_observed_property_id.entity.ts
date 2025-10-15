import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_observed_property_id' })
export class MvAqiObservedPropertyId {
  @ViewColumn({ name: 'observed_property_id' })
  observed_property_id: string;
}
