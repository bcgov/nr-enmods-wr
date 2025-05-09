import "dotenv/config";
import { Logger, MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { HTTPLoggerMiddleware } from "./middleware/req.res.logger";
import { loggingMiddleware, PrismaModule } from "nestjs-prisma";
import { ConfigModule } from "@nestjs/config";
import { UsersModule } from "./users/users.module";
import { AppService } from "./app.service";
import { AppController } from "./app.controller";
import { MetricsController } from "./metrics.controller";
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from "./health.controller";
import { JWTAuthModule } from "./auth/jwtauth.module";
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
    UsersModule,
    JWTAuthModule,
    SearchModule,
  ],
  controllers: [AppController,MetricsController, HealthController],
  providers: [AppService]
})
export class AppModule { // let's add a middleware on all routes
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HTTPLoggerMiddleware).exclude({ path: 'metrics', method: RequestMethod.ALL }, { path: 'health', method: RequestMethod.ALL }).forRoutes('*');
  }
}
