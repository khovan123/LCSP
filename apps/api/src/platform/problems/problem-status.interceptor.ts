import { Injectable } from "@nestjs/common";
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from "@nestjs/common";
import type { ProblemResult } from "@lcsp/contracts/auth";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { setProblemResponseMetadata } from "./problem-response-metadata.js";

type HttpResponse = {
  status: (statusCode: number) => unknown;
  locals?: Record<string, unknown>;
};

@Injectable()
export class ProblemStatusInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<HttpResponse>();

    return next.handle().pipe(
      map((body: unknown) => {
        const status = getProblemStatus(body);
        if (status !== undefined) {
          setProblemResponseMetadata(response, body);
          response.status(status);
        }

        return body;
      }),
    );
  }
}

function getProblemStatus(body: unknown): number | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const result = body as Partial<ProblemResult<string>>;
  const status =
    result.ok === false && result.problem !== undefined
      ? result.problem.status
      : undefined;

  return isHttpErrorStatus(status) ? status : undefined;
}

function isHttpErrorStatus(status: unknown): status is number {
  return typeof status === "number" && status >= 400 && status <= 599;
}
