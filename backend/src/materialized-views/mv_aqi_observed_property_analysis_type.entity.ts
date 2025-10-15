import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_observed_property_analysis_type' })
export class MvAqiObservedPropertyAnalysisType {
  @ViewColumn({ name: 'observed_property_analysis_type' })
  observed_property_analysis_type: string;
}
