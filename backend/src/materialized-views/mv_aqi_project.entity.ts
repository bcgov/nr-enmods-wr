import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_project' })
export class MvAqiProject {
  @ViewColumn({ name: 'project' })
  project: string;

  @ViewColumn({ name: 'project_name' })
  project_name: string;
}
