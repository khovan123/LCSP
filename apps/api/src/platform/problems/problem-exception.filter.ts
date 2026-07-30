import { Catch, HttpException, HttpStatus } from "@nestjs/common";
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
  headers?: Record<string, string | string[] | undefined>;
};

@Catch()
export class ProblemExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();
    const status = getHttpStatus(exception);
    const body = getExceptionBody(exception);
    const correlationId = getCorrelationId(body, request);

    response.status(status).json(toProblemResult(body, correlationId, status));
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
