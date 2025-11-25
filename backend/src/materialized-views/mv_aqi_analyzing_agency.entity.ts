import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_analyzing_agency' })
export class MvAqiAnalyzingAgency {
  @ViewColumn({ name: 'analyzing_agency' })
  analyzing_agency: string;

  @ViewColumn({ name: 'analyzing_agency_full_name' })
  analyzing_agency_full_name: string;
}
