import { Controller, Get } from '@nestjs/common';
import { S3SyncLogService } from './s3_sync_log.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('s3-sync-log')
@Controller({ path: "s3-sync-log", version: "1" })
export class S3SyncLogController {
  constructor(private readonly s3SyncLogService: S3SyncLogService) {}

  @Get('last-sync-time')
  getLastSyncTime() {
    return this.s3SyncLogService.getLastSyncTime();
  }

  @Get()
  findAll() {
    return this.s3SyncLogService.findAll();
  }
}
