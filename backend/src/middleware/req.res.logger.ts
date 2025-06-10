import { Request, Response, NextFunction } from "express";
import { Injectable, NestMiddleware, Logger } from "@nestjs/common";

@Injectable()
export class HTTPLoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl } = request;

    response.on("finish", () => {
      const userAgent = request.get("user-agent") || "";
      if (userAgent.includes("kube-probe")) return; // Skip kube-probe logs
      const { statusCode } = response;
      const contentLength = response.get("content-length") || "-";
      const hostedHttpLogFormat = `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent}`;
      this.logger.log(hostedHttpLogFormat);
    });
    next();
  }
}
