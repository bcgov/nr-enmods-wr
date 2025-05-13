import "dotenv/config";
import { Logger, MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { HTTPLoggerMiddleware } from "./middleware/req.res.logger";
import { ConfigModule } from "@nestjs/config";
import { AppService } from "./app.service";
import { AppController } from "./app.controller";
import { MetricsController } from "./metrics.controller";
import { TerminusModule } from '@nestjs/terminus';
import { SearchController } from './search/search.controller';
import { SearchService } from "./search/search.service";
import { SearchModule } from './search/search.module';

function getMiddlewares() {
  return [];
}

@Module({
  imports: [
    ConfigModule.forRoot(),
    TerminusModule,
    SearchModule,
  ],
  controllers: [AppController,MetricsController],
  providers: [AppService]
})
export class AppModule { // let's add a middleware on all routes
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HTTPLoggerMiddleware).exclude({ path: 'metrics', method: RequestMethod.ALL }, { path: 'health', method: RequestMethod.ALL }).forRoutes('*');
  }
}
