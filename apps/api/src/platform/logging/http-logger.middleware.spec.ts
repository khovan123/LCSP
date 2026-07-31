import { jest } from "@jest/globals";

import { HttpLoggerMiddleware } from "./http-logger.middleware.js";

describe("HttpLoggerMiddleware", () => {
  it("logs problem metadata for 4xx responses", () => {
    const middleware = new HttpLoggerMiddleware();
    const warnSpy = jest.spyOn(
      Reflect.get(middleware, "logger") as { warn: (message: string) => void },
      "warn",
    );
    const request = {
      method: "POST",
      originalUrl: "/auth/sign-in",
    };
    let finishListener: (() => void) | undefined;
    const response = {
      statusCode: 401,
      locals: {
        problemResponse: {
          code: "INVALID_CREDENTIALS",
          requiredAction: "RETRY_AUTH",
          correlationId: "corr-401",
        },
      },
      on: jest.fn((_event: string, listener: () => void) => {
        finishListener = listener;
      }),
    };
    const next = jest.fn();

    middleware.use(
      request as Parameters<HttpLoggerMiddleware["use"]>[0],
      response as unknown as Parameters<HttpLoggerMiddleware["use"]>[1],
      next,
    );
    finishListener?.();

    expect(next).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("code=INVALID_CREDENTIALS"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("requiredAction=RETRY_AUTH"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("correlationId=corr-401"),
    );
  });
});
