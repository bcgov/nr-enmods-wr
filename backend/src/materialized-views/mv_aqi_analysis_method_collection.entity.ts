import { ViewEntity, ViewColumn } from "typeorm";

@ViewEntity({ name: "mv_aqi_analysis_method_collection" })
export class MvAqiAnalysisMethodCollection {
  @ViewColumn({ name: "analysis_method_id" })
  analysis_method_id: string;

  @ViewColumn({ name: "analysis_method" })
  analysis_method: string;
}
