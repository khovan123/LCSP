import type { ProblemResult } from "@lcsp/contracts/auth";

export type ProblemResponseMetadata = {
  code: string;
  correlationId: string;
  requiredAction: string;
};

type HttpResponseWithLocals = {
  locals?: Record<string, unknown>;
};

const PROBLEM_RESPONSE_METADATA_KEY = "problemResponse";

export function setProblemResponseMetadata(
  response: HttpResponseWithLocals,
  body: unknown,
): void {
  const metadata = getProblemResponseMetadata(body);
  if (!metadata) {
    return;
  }

  response.locals ??= {};
  response.locals[PROBLEM_RESPONSE_METADATA_KEY] = metadata;
}

export function readProblemResponseMetadata(
  response: HttpResponseWithLocals,
): ProblemResponseMetadata | null {
  const value = response.locals?.[PROBLEM_RESPONSE_METADATA_KEY];
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { code?: unknown }).code !== "string" ||
    typeof (value as { correlationId?: unknown }).correlationId !== "string" ||
    typeof (value as { requiredAction?: unknown }).requiredAction !== "string"
  ) {
    return null;
  }

  return value as ProblemResponseMetadata;
}

function getProblemResponseMetadata(
  body: unknown,
): ProblemResponseMetadata | null {
  if (!isProblemResult(body)) {
    return null;
  }

  return {
    code: body.problem.code,
    correlationId: body.problem.correlationId,
    requiredAction: body.problem.requiredAction,
  };
}

function isProblemResult(body: unknown): body is ProblemResult<string> {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { ok?: unknown }).ok === false &&
    typeof (body as { problem?: { code?: unknown } }).problem?.code === "string"
  );
}
