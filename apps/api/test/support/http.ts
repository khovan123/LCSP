import type { Server } from "node:net";
import * as assert from "node:assert/strict";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { Response } from "supertest";

type HttpTestAgent = ReturnType<typeof request>;

/**
 * `INestApplication#getHttpServer()` returns `any`, so every raw
 * `request(app.getHttpServer())` call trips `@typescript-eslint/no-unsafe-argument`.
 * Route through here once so the unsafe cast lives in a single place.
 */
export function httpRequest(app: INestApplication): HttpTestAgent {
  const server: unknown = app.getHttpServer();
  return request(server as Server);
}

type SuccessEnvelope<T> = {
  ok: true;
  data: T;
};

type ProblemEnvelope = {
  ok: false;
  problem: {
    code?: string;
    correlationId?: string;
    [key: string]: unknown;
  };
};

function responseBody(responseOrBody: unknown): unknown {
  return typeof responseOrBody === "object" &&
    responseOrBody !== null &&
    "body" in responseOrBody
    ? (responseOrBody as Response).body
    : responseOrBody;
}

function describeResponse(responseOrBody: unknown): string {
  if (
    typeof responseOrBody === "object" &&
    responseOrBody !== null &&
    "body" in responseOrBody
  ) {
    const response = responseOrBody as Response;
    const body = response.body as unknown;
    return JSON.stringify({
      body,
      status: response.status,
      text: response.text,
    });
  }

  return JSON.stringify(responseOrBody);
}

export function successBody<T>(responseOrBody: unknown): T {
  const body = responseBody(responseOrBody) as Partial<SuccessEnvelope<T>>;
  assert.equal(body.ok, true, describeResponse(responseOrBody));
  return body.data as T;
}

export function problemBody(responseOrBody: unknown) {
  const body = responseBody(responseOrBody) as Partial<ProblemEnvelope>;
  assert.equal(body.ok, false, describeResponse(responseOrBody));
  assert.ok(body.problem, describeResponse(responseOrBody));
  return body.problem;
}

export function problemCode(responseOrBody: unknown): string | undefined {
  const problem = problemBody(responseOrBody);
  return problem.code;
}
