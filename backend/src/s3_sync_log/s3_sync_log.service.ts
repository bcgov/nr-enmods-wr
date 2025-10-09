import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3SyncLog } from './entities/s3_sync_log.entity';

@Injectable()
export class S3SyncLogService {
  constructor(
    @InjectRepository(S3SyncLog)
    private readonly s3SyncLogRepository: Repository<S3SyncLog>,
  ) {}

  async getLastSyncTime() {
    const lastLog = await this.s3SyncLogRepository.findOne({
      order: { finish_time: 'DESC' },
      where: { status: 'SUCCESS' },
    });
    return lastLog ? lastLog.finish_time : null;
  }

  async findAll(): Promise<S3SyncLog[]> {
    return this.s3SyncLogRepository.find();
  }
}
