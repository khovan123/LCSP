import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

import { readProblemResponseMetadata } from "../problems/problem-response-metadata.js";

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl } = request;
    const startTime = Date.now();

    response.on("finish", () => {
      const { statusCode } = response;
      const duration = Date.now() - startTime;
      const message = formatHttpLogMessage(
        method,
        originalUrl,
        statusCode,
        duration,
        response,
      );

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}

function formatHttpLogMessage(
  method: string,
  originalUrl: string,
  statusCode: number,
  duration: number,
  response: Response,
): string {
  const baseMessage = `${method} ${originalUrl} ${statusCode} +${duration}ms`;
  const problem = readProblemResponseMetadata(response);
  if (!problem) {
    return baseMessage;
  }

  return `${baseMessage} code=${problem.code} requiredAction=${problem.requiredAction} correlationId=${problem.correlationId}`;
}
