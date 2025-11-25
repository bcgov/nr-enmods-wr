import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_sampling_agency' })
export class MvAqiSamplingAgency {
  @ViewColumn({ name: 'sampling_agency' })
  sampling_agency: string;
}
