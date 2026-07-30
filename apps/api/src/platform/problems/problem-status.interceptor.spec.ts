import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { jest } from "@jest/globals";
import {
  AUTH_ERROR_CODES,
  createProblemResult,
  type ProblemResult,
} from "@lcsp/contracts/auth";
import { lastValueFrom, of } from "rxjs";

import { ProblemStatusInterceptor } from "./problem-status.interceptor.js";

describe("ProblemStatusInterceptor", () => {
  it("sets the HTTP status from ProblemResult body status", async () => {
    const response = { status: jest.fn() };
    const interceptor = new ProblemStatusInterceptor();
    const body: ProblemResult = createProblemResult(
      AUTH_ERROR_CODES.pbacDenied,
      "correlation-1",
    );

    const result = await lastValueFrom(
      interceptor.intercept(
        createExecutionContext(response),
        createCallHandler(body),
      ),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(result).toBe(body);
  });

  it("does not change status for successful payloads", async () => {
    const response = { status: jest.fn() };
    const interceptor = new ProblemStatusInterceptor();
    const body = { ok: true, data: { id: "assessment-1" } };

    const result = await lastValueFrom(
      interceptor.intercept(
        createExecutionContext(response),
        createCallHandler(body),
      ),
    );

    expect(response.status).not.toHaveBeenCalled();
    expect(result).toBe(body);
  });
});

function createExecutionContext(response: {
  status: jest.Mock;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as ExecutionContext;
}

function createCallHandler(body: unknown): CallHandler {
  return {
    handle: () => of(body),
  };
}
