import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_lab_batch_id' })
export class MvAqiLabBatchId {
  @ViewColumn({ name: 'lab_batch_id' })
  lab_batch_id: string;
}
