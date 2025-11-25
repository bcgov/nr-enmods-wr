import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_qc_type' })
export class MvAqiQcType {
  @ViewColumn({ name: 'qc_type' })
  qc_type: string;
}
