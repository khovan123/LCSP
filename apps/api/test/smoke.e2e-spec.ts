/**
 * AC-027: API health check and basic connectivity smoke test.
 */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module.js";
import { TEST_DATABASE_URL, pushPrismaSchema } from "./support/auth-workspace-test-helpers.js";

describe("API smoke test (e2e) [AC-027]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    pushPrismaSchema();
    prisma = new PrismaClient({ adapter: new PrismaPg(TEST_DATABASE_URL) });
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("AC-027: Health endpoint returns 200", async () => {
    const result = await request(app.getHttpServer()).get("/health");
    assert.ok(
      [200, 204].includes(result.status),
      `Health endpoint must return 2xx, got ${result.status}`,
    );
  });

  it("AC-027: Health endpoint response does not expose internal configuration", async () => {
    const result = await request(app.getHttpServer()).get("/health");
    if (result.status !== 200) return;

    const body = JSON.stringify(result.body);
    assert.doesNotMatch(body, /DATABASE_URL|password|secret|token/i, "Health must not expose config secrets");
  });

  it("AC-027: API is reachable and JSON Content-Type is returned for structured endpoints", async () => {
    const result = await request(app.getHttpServer())
      .get("/assessments")
      .set("Accept", "application/json");

    // Should be 401 (no auth) or 200 — not 500 or timeout
    assert.ok(
      result.status < 500,
      `API must not return 5xx, got ${result.status}`,
    );
    if (result.status < 400) {
      assert.match(
        result.headers["content-type"] ?? "",
        /application\/json/,
        "JSON endpoints must return application/json content type",
      );
    }
  });

  it("AC-027: Database connectivity verified — Prisma can connect to test DB", async () => {
    // Raw DB check — not via API
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 as result`;
    assert.equal(result[0].result, 1, "Database must be reachable");
  });

  it("AC-027: Unknown routes return 404, not 500", async () => {
    const result = await request(app.getHttpServer())
      .get("/this-route-does-not-exist-at-all-xyz");
    assert.equal(result.status, 404, "Unknown routes must return 404");
  });
});
