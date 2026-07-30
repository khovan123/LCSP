import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { ProblemResult } from "@lcsp/contracts/auth";
import { randomUUID } from "node:crypto";

import { internalServerProblem } from "./problem-factory.js";

type HttpResponse = {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
};

type HttpRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Catch()
export class ProblemExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();
    const status = getHttpStatus(exception);
    const body = getExceptionBody(exception);
    const correlationId = getCorrelationId(body, request);

    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method ?? "HTTP"} ${request.url ?? ""} ${status} - Internal Server Error`,
        exception instanceof Error
          ? exception.stack
          : formatExceptionBody(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${correlationId}] ${request.method ?? "HTTP"} ${request.url ?? ""} ${status} - ${formatExceptionBody(body)}`,
      );
    }

    response.status(status).json(toProblemResult(body, correlationId, status));
  }
}

function formatExceptionBody(body: unknown): string {
  if (body === null || body === undefined) {
    return "null";
  }
  if (typeof body === "string") {
    return body;
  }
  if (
    typeof body === "number" ||
    typeof body === "boolean" ||
    typeof body === "bigint" ||
    typeof body === "symbol"
  ) {
    return String(body);
  }
  try {
    return JSON.stringify(body);
  } catch (error) {
    return error instanceof Error ? error.message : "unserializable_body";
  }
}

function toProblemResult(
  body: unknown,
  correlationId: string,
  status: number,
): ProblemResult<string> {
  if (isProblemResult(body)) {
    return {
      ok: false,
      problem: {
        ...body.problem,
        status,
        correlationId: body.problem.correlationId || correlationId,
      },
    };
  }

  return internalServerProblem(correlationId);
}

function getHttpStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function getExceptionBody(exception: unknown): unknown {
  if (exception instanceof HttpException) {
    return exception.getResponse();
  }

  return null;
}

function getCorrelationId(body: unknown, request: HttpRequest): string {
  if (isProblemResult(body) && body.problem.correlationId) {
    return body.problem.correlationId;
  }

  const header = request.headers?.["x-correlation-id"];
  const headerValue = Array.isArray(header) ? header[0] : header;
  if (headerValue) {
    return headerValue;
  }

  return randomUUID();
}

function isProblemResult(body: unknown): body is ProblemResult<string> {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { ok?: unknown }).ok === false &&
    typeof (body as { problem?: { code?: unknown } }).problem?.code === "string"
  );
}
