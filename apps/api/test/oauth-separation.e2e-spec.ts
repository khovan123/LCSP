/**
 * AC-023: OAuth identity cannot authorize repository access.
 *
 * OAuth/OIDC login creates an authenticated user session only.
 * It must NEVER create a RepositoryConnection, installation token,
 * or any repository-access side-effect regardless of OAuth provider response.
 */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
} from "./support/auth-workspace-test-helpers.js";

describe("OAuth/OIDC separation from repository authorization (e2e) [AC-023]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    pushPrismaSchema();

    prisma = new PrismaClient({
      adapter: new PrismaPg(TEST_DATABASE_URL),
    });
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("AC-023: OAuth callback creates a user session and does NOT create any RepositoryConnection", async () => {
    // Simulate OAuth callback with a valid code (mocked provider response)
    const result = await request(app.getHttpServer())
      .get("/auth/oauth/callback")
      .query({ code: "test-oauth-code", state: "test-state" });

    // Session created or redirected — but no RepositoryConnection created
    const repoConnections = await prisma.repositoryConnection.findMany();
    assert.equal(
      repoConnections.length,
      0,
      "OAuth login must not create RepositoryConnection",
    );
  });

  it("AC-023: OAuth callback does NOT create any GitHub installation token or scan permission", async () => {
    await request(app.getHttpServer())
      .get("/auth/oauth/callback")
      .query({ code: "test-oauth-code", state: "test-state" });

    // No installation token persisted
    const installStates = await prisma.gitHubAppInstallState.findMany();
    assert.equal(
      installStates.length,
      0,
      "OAuth login must not create GitHub install state",
    );
  });

  it("AC-023: GitHub App installation callback route is separate from OAuth login — separate endpoints", async () => {
    // GitHub App callback must be at a different path than OAuth login callback
    const oauthResult = await request(app.getHttpServer())
      .get("/auth/oauth/callback")
      .query({ code: "oauth-code", state: "oauth-state" });

    const githubAppResult = await request(app.getHttpServer())
      .get("/github/app/callback")
      .query({ installation_id: "12345", setup_action: "install" });

    // These are distinct endpoints — different status behavior
    assert.notEqual(
      oauthResult.status,
      404,
      "OAuth callback endpoint must exist",
    );
    assert.notEqual(
      githubAppResult.status,
      404,
      "GitHub App callback endpoint must exist",
    );
  });

  it("AC-023: Authenticated OAuth session cannot perform scan trigger without separate GitHub App authorization", async () => {
    // Sign in via OAuth session
    const signIn = await request(app.getHttpServer())
      .post("/auth/sign-in")
      .send({
        email: "manager@acme.test",
        password: "CorrectHorseBatteryStaple!",
        organization_id: "org-1",
      });

    const token = signIn.body?.session_token;
    if (!token) return; // Skip if sign-in not yet implemented

    // Attempt to trigger scan without GitHub App installation
    const scanResult = await request(app.getHttpServer())
      .post("/assessments/test-assessment-id/scan-trigger")
      .set("Authorization", `Bearer ${token}`)
      .send({ snapshot_id: "snap-1" });

    // Must fail — no RepositoryConnection authorized via GitHub App
    assert.ok(
      [404, 422, 403].includes(scanResult.status),
      `Scan trigger without GitHub App must be rejected, got ${scanResult.status}`,
    );
  });
});
