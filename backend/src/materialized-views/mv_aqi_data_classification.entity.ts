import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_data_classification' })
export class MvAqiDataClassification {
  @ViewColumn({ name: 'data_classification' })
  data_classification: string;
}
