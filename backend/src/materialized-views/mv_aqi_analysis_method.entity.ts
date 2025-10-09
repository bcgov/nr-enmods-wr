import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_analysis_method' })
export class MvAqiAnalysisMethod {
  @ViewColumn({ name: 'analysis_method' })
  analysis_method: string;

  @ViewColumn({ name: 'analyzed_method_name' })
  analyzed_method_name: string;
}
