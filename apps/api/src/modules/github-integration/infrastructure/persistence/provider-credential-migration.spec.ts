import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "@jest/globals";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260824120000_add_provider_credentials/migration.sql",
);

describe("provider credential migration", () => {
  it("explicitly backfills existing connections before enforcing the mode", () => {
    const sql = readFileSync(migrationPath, "utf8");
    const add = sql.indexOf('ADD COLUMN "authenticationMode"');
    const backfill = sql.indexOf(
      `UPDATE "RepositoryConnection" SET "authenticationMode" = 'GITHUB_APP'`,
    );
    const required = sql.indexOf(
      'ALTER COLUMN "authenticationMode" SET NOT NULL',
    );
    expect(add).toBeGreaterThan(-1);
    expect(backfill).toBeGreaterThan(add);
    expect(required).toBeGreaterThan(backfill);
    expect(sql).not.toMatch(
      /UPDATE\s+"RepositoryConnection"\s+SET\s+"installationId"/iu,
    );
  });

  it("stores encrypted material as bytea and never adds a plaintext column", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain('"ciphertext" BYTEA NOT NULL');
    expect(sql).toContain('"wrappedDekCiphertext" BYTEA NOT NULL');
    expect(sql).not.toMatch(/"(plaintext|token|pat|secret)"\s/iu);
  });
});
