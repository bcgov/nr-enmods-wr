import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_work_order_number' })
export class MvAqiWorkOrderNumber {
  @ViewColumn({ name: 'work_order_number' })
  work_order_number: string;
}
