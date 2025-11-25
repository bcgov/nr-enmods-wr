import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'mv_aqi_collection_method' })
export class MvAqiCollectionMethod {
  @ViewColumn({ name: 'collection_method' })
  collection_method: string;
}
