import type { Server } from "node:net";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";

/**
 * `INestApplication#getHttpServer()` returns `any`, so every raw
 * `request(app.getHttpServer())` call trips `@typescript-eslint/no-unsafe-argument`.
 * Route through here once so the unsafe cast lives in a single place.
 */
export function httpRequest(app: INestApplication) {
  const server: unknown = app.getHttpServer();
  return request(server as Server);
}
