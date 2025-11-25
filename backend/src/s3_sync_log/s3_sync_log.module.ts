import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3SyncLogService } from './s3_sync_log.service';
import { S3SyncLogController } from './s3_sync_log.controller';
import { S3SyncLog } from './entities/s3_sync_log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([S3SyncLog])],
  controllers: [S3SyncLogController],
  providers: [S3SyncLogService],
})
export class S3SyncLogModule {}
