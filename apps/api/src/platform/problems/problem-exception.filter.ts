import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import {
  AUTH_ERROR_CODES,
  createProblemResult,
  PROBLEM_DEFAULTS,
  REQUIRED_ACTIONS,
  type AppProblem,
  type AuthErrorCode,
  type ProblemKey,
  type ProblemMeta,
  type ProblemResult,
} from "@lcsp/contracts/auth";
import { randomUUID } from "node:crypto";

type HttpResponse = {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
};

type HttpRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

type LegacyProblemBody = {
  ok?: unknown;
  problem?: {
    code?: unknown;
    correlationId?: unknown;
    correlation_id?: unknown;
    meta?: unknown;
  };
  code?: unknown;
  error_code?: unknown;
  reason_code?: unknown;
  correlationId?: unknown;
  correlation_id?: unknown;
  meta?: unknown;
};

const GENERIC_TITLE_KEY: ProblemKey = "auth.errors.validationFailed.title";
const GENERIC_DETAIL_KEY: ProblemKey = "auth.errors.validationFailed.detail";

@Catch()
export class ProblemExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();
    const status = getHttpStatus(exception);
    const body = getExceptionBody(exception);
    const correlationId = getCorrelationId(body, request);
    const code = getProblemCode(body) ?? fallbackCode(status);

    response.status(status).json(
      toProblemResult({
        body,
        code,
        correlationId,
        status,
      }),
    );
  }
}

function toProblemResult({
  body,
  code,
  correlationId,
  status,
}: {
  body: unknown;
  code: string;
  correlationId: string;
  status: number;
}): ProblemResult<string> {
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

  if (isAuthErrorCode(code)) {
    return createProblemResult(code, correlationId, { status });
  }

  return {
    ok: false,
    problem: createGenericProblem(code, correlationId, status, body),
  };
}

function createGenericProblem(
  code: string,
  correlationId: string,
  status: number,
  body: unknown,
): AppProblem<string> {
  return {
    type: `problem/${code.toLowerCase().replaceAll("_", "-")}`,
    status,
    code,
    titleKey: GENERIC_TITLE_KEY,
    detailKey: GENERIC_DETAIL_KEY,
    requiredAction: REQUIRED_ACTIONS.none,
    correlationId,
    meta: getProblemMeta(body),
  };
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

function getProblemCode(body: unknown): string | undefined {
  if (typeof body === "string") {
    return undefined;
  }
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const candidate = body as LegacyProblemBody;
  const code =
    candidate.problem?.code ??
    candidate.code ??
    candidate.error_code ??
    candidate.reason_code;

  return typeof code === "string" ? code : undefined;
}

function getCorrelationId(body: unknown, request: HttpRequest): string {
  const header = request.headers?.["x-correlation-id"];
  const headerValue = Array.isArray(header) ? header[0] : header;
  if (headerValue) {
    return headerValue;
  }

  if (typeof body === "object" && body !== null) {
    const candidate = body as LegacyProblemBody;
    const bodyCorrelationId =
      candidate.problem?.correlationId ??
      candidate.problem?.correlation_id ??
      candidate.correlationId ??
      candidate.correlation_id;
    if (typeof bodyCorrelationId === "string" && bodyCorrelationId) {
      return bodyCorrelationId;
    }
  }

  return randomUUID();
}

function getProblemMeta(body: unknown): ProblemMeta | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const meta =
    (body as LegacyProblemBody).problem?.meta ??
    (body as LegacyProblemBody).meta;
  if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
    return undefined;
  }

  const safeMeta: ProblemMeta = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      safeMeta[key] = value;
    }
  }

  return Object.keys(safeMeta).length > 0 ? safeMeta : undefined;
}

function fallbackCode(status: number): AuthErrorCode {
  if (status === 401) {
    return AUTH_ERROR_CODES.sessionInvalid;
  }
  if (status === 403) {
    return AUTH_ERROR_CODES.pbacDenied;
  }

  return AUTH_ERROR_CODES.validationFailed;
}

function isAuthErrorCode(code: string): code is AuthErrorCode {
  return Object.hasOwn(PROBLEM_DEFAULTS, code);
}

function isProblemResult(body: unknown): body is ProblemResult<string> {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { ok?: unknown }).ok === false &&
    typeof (body as { problem?: { code?: unknown } }).problem?.code === "string"
  );
}
