import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_observed_property_name' })
export class MvAqiObservedPropertyName {
  @ViewColumn({ name: 'observed_property_name' })
  observed_property_name: string;
}
