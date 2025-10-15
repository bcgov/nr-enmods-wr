import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_observed_property_result_type' })
export class MvAqiObservedPropertyResultType {
  @ViewColumn({ name: 'observed_property_result_type' })
  observed_property_result_type: string;
}
