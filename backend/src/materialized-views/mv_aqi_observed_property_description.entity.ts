import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_observed_property_description' })
export class MvAqiObservedPropertyDescription {
  @ViewColumn({ name: 'observed_property_description' })
  observed_property_description: string;
}
