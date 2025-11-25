import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_medium' })
export class MvAqiMedium {
  @ViewColumn({ name: 'medium' })
  medium: string;
}
