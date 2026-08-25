import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "@jest/globals";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "prisma/migrations/20260824160000_allow_cli_repository_connections/migration.sql",
  ),
  "utf8",
);

describe("CLI repository connection migration", () => {
  it("verifies App rows before making installationId nullable", () => {
    expect(sql.indexOf("IF EXISTS")).toBeGreaterThan(-1);
    expect(
      sql.indexOf('ALTER COLUMN "installationId" DROP NOT NULL'),
    ).toBeGreaterThan(sql.indexOf("IF EXISTS"));
  });

  it("enforces exactly one authentication mechanism and preserves the App unique index", () => {
    expect(sql).toContain("\"authenticationMode\" = 'GITHUB_APP'");
    expect(sql).toContain("\"authenticationMode\" = 'GITHUB_CLI_CREDENTIAL'");
    expect(sql).toContain('"credentialAuthorizationId" IS NOT NULL');
    expect(sql).toContain("NOT VALID");
    expect(sql).toContain("VALIDATE CONSTRAINT");
    expect(sql).not.toMatch(/DROP\s+(INDEX|CONSTRAINT).*installationId/iu);
  });
});
