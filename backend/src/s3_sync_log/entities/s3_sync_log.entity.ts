import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 's3_sync_log' })
export class S3SyncLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'text', default: 'AQI_AWS_S3_SYNC' })
  process_name: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  start_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finish_time: Date;

  @Column({ type: 'text' })
  status: string;

  @Column({ type: 'bigint', default: 0 })
  rows_loaded: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'text', default: 'AQI_CSV_IMPORT_STAGING' })
  staging_table_name: string;

  @Column({ type: 'text', default: 'AQI_CSV_IMPORT_OPERATIONAL' })
  operational_table_name: string;
}
