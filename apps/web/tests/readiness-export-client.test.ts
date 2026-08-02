import * as assert from "node:assert/strict";
import { test } from "node:test";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { READINESS_EXPORT_STATUSES } from "@lcsp/contracts/wizard";

import {
  sanitizeReadinessExportPayload,
  toReadinessExportOutcome,
} from "../src/lib/api/readiness-export-client.ts";

const generatedExport = {
  artifact_type: "WIZARD_READINESS_EXPORT",
  export_id: "export-1",
  assessment_id: "assessment-1",
  owner_id: "manager-1",
  status: READINESS_EXPORT_STATUSES.generated,
  label: "Wizard Readiness Export",
  badge: "READINESS_ONLY",
  title: "Wizard Readiness Export",
  preview: "Readiness-only preparation summary.",
  metadata: {
    artifact_type: "WIZARD_READINESS_EXPORT",
    label: "Wizard Readiness Export",
    readiness_only: true,
    classification_status: "LOCKED_EVIDENCE_REQUIRED",
    wizard_profile_version: 3,
    assessment_id: "assessment-1",
    generated_by: "manager-1",
    version: 1,
    generated_at: "2026-08-01T00:00:00.000Z",
  },
  readiness_only: true,
  classification_status: "LOCKED_EVIDENCE_REQUIRED",
  classification_locked: true,
  missing_evidence: [],
  unresolved_unknown_items: [],
  preparation_guidance: ["Collect technical evidence."],
  generated_at: "2026-08-01T00:00:00.000Z",
  version: 1,
  correlation_id: "corr-1",
  download_state: "READY",
  download_url:
    "/assessments/assessment-1/wizard/readiness-exports/export-1/download",
};

test("readiness export outcome maps a generated artifact", () => {
  const outcome = toReadinessExportOutcome(generatedExport, true, 201);

  assert.equal(outcome.kind, "created");
  if (outcome.kind === "created") {
    assert.equal(outcome.data.export_id, "export-1");
    assert.equal(outcome.data.label, "Wizard Readiness Export");
    assert.equal(outcome.data.version, 1);
  }
});

test("readiness export outcome redirects an invalid session", () => {
  const outcome = toReadinessExportOutcome(
    {
      ok: false,
      problem: {
        code: AUTH_ERROR_CODES.sessionInvalid,
      },
    },
    false,
    401,
    AUTH_ERROR_CODES.sessionInvalid,
  );

  assert.deepEqual(outcome, { kind: "redirect", location: "/sign-in" });
});

test("readiness export sanitizer rejects incomplete responses", () => {
  assert.deepEqual(
    sanitizeReadinessExportPayload(generatedExport),
    generatedExport,
  );
  assert.equal(
    sanitizeReadinessExportPayload({ ...generatedExport, label: undefined }),
    null,
  );
});

test("readiness export history preserves only valid versioned artifacts", async () => {
  const { sanitizeReadinessExportHistoryPayload } =
    await import("../src/lib/api/readiness-export-client.ts");

  assert.deepEqual(
    sanitizeReadinessExportHistoryPayload([
      { ...generatedExport, version: 2 },
      { ...generatedExport, export_id: 42 },
      generatedExport,
    ]),
    [{ ...generatedExport, version: 2 }, generatedExport],
  );
  assert.equal(sanitizeReadinessExportHistoryPayload(null), null);
});
