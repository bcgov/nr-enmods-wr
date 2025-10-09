export class CreateS3SyncLogDto {
  process_name?: string;
  start_time?: Date;
  finish_time?: Date;
  status?: string;
  rows_loaded?: number;
  error_message?: string;
  staging_table_name?: string;
  operational_table_name?: string;
}
