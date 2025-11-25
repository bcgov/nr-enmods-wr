import "dotenv/config";
import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { HTTPLoggerMiddleware } from "./middleware/req.res.logger";
import { ConfigModule } from "@nestjs/config";
import { AppService } from "./app.service";
import { AppController } from "./app.controller";
import { MetricsController } from "./metrics.controller";
import { TerminusModule } from "@nestjs/terminus";
import { SearchModule } from "./search/search.module";
import { GeodataModule } from "./geodata/geodata.module";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import ormconfig from "src/ormconfig";
import { ObservationsModule } from "./observations/observations.module";
import { S3SyncLogModule } from './s3_sync_log/s3_sync_log.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormconfig),
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TerminusModule,
    SearchModule,
    GeodataModule,
    ObservationsModule,
    S3SyncLogModule,
  ],
  controllers: [AppController, MetricsController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HTTPLoggerMiddleware)
      .exclude(
        { path: "metrics", method: RequestMethod.ALL },
        { path: "health", method: RequestMethod.ALL },
      )
      .forRoutes("*");
  }
}
