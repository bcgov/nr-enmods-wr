import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_observed_property' })
export class MvAqiObservedProperty {
  @ViewColumn({ name: 'observed_property_id' })
  observed_property_id: string;

  @ViewColumn({ name: 'observed_property_name' })
  observed_property_name: string;

  @ViewColumn({ name: 'observed_property_description' })
  observed_property_description: string;

  @ViewColumn({ name: 'observed_property_analysis_type' })
  observed_property_analysis_type: string;

  @ViewColumn({ name: 'observed_property_result_type' })
  observed_property_result_type: string;
}
