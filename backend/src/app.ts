import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { customLogger } from "./common/logger.config";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { VersioningType } from "@nestjs/common";
import { metricsMiddleware } from "./prom";
import cors from "cors";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

/**
 *
 */
export async function bootstrap() {
  const cosrOptions: CorsOptions = {
    exposedHeaders: ["Content-Disposition"],
  };
  const app: NestExpressApplication =
    await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: customLogger,
    });
  app.use(helmet());
  app.enableCors(cosrOptions);
  app.set("trust proxy", 1);
  app.use(metricsMiddleware);
  app.enableShutdownHooks();
  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: "v",
  });
  const config = new DocumentBuilder()
    .setTitle("Users example")
    .setDescription("The user API description")
    .setVersion("1.0")
    .addTag("users")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);
  return app;
}
