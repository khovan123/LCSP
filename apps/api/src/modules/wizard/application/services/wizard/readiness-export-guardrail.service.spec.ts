import { describe, expect, it } from "@jest/globals";
import {
  ANSWER_STATES,
  READINESS_CLASSIFICATION_STATUSES,
  READINESS_EXPORT_ARTIFACT_TYPES,
  READINESS_EXPORT_BADGES,
  READINESS_EXPORT_GUARDRAIL_REASONS,
  READINESS_EXPORT_LABELS,
} from "@lcsp/contracts/wizard";

import { ReadinessExportGuardrailService } from "./readiness-export-guardrail.service.js";

describe("ReadinessExportGuardrailService", () => {
  it("allows readiness-only content", () => {
    const result = new ReadinessExportGuardrailService().check(
      readinessContent(),
    );

    expect(result).toEqual({ passed: true, blockedReason: null });
  });

  it("blocks structurally incomplete persisted content", () => {
    const content = readinessContent();
    const result = new ReadinessExportGuardrailService().check({
      ...content,
      metadata: { ...content.metadata, version: "../../unsafe" },
    });

    expect(result).toEqual({
      passed: false,
      blockedReason: READINESS_EXPORT_GUARDRAIL_REASONS.contractMismatch,
    });
  });

  it("blocks risk, legal conclusion, and certification overclaims", () => {
    const service = new ReadinessExportGuardrailService();

    expect(service.check({ title: "High risk classification result" })).toEqual(
      {
        passed: false,
        blockedReason: READINESS_EXPORT_GUARDRAIL_REASONS.overclaim,
      },
    );
    expect(service.check({ body: "This is certified." }).passed).toBe(false);
    expect(service.check({ body: "Legal conclusion ready." }).passed).toBe(
      false,
    );
    expect(service.check({ body: "HIGH_RISK" }).passed).toBe(false);
    expect(service.check({ body: "NON_COMPLIANT" }).passed).toBe(false);
    expect(service.check({ body: "FINAL_CLASSIFICATION" }).passed).toBe(false);
  });

  it("blocks unbounded persisted content before PDF rendering", () => {
    const service = new ReadinessExportGuardrailService();
    const base = readinessContent();

    expect(
      service.check({
        ...base,
        preparation_guidance: Array.from({ length: 101 }, () => "Prepare."),
      }).passed,
    ).toBe(false);
    expect(service.check({ ...base, preview: "x".repeat(2_001) }).passed).toBe(
      false,
    );
  });

  it("blocks readiness artifacts whose title, badge, or metadata contract drifts", () => {
    const service = new ReadinessExportGuardrailService();
    const base = readinessContent();

    expect(service.check({ ...base, title: "Assessment result" })).toEqual({
      passed: false,
      blockedReason: READINESS_EXPORT_GUARDRAIL_REASONS.contractMismatch,
    });
    expect(service.check({ ...base, badge: "FINAL" }).passed).toBe(false);
    expect(
      service.check({
        ...base,
        metadata: { ...base.metadata, readiness_only: false },
      }).passed,
    ).toBe(false);
  });
});

function readinessContent() {
  return {
    artifact_type: READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport,
    label: READINESS_EXPORT_LABELS.wizardReadinessExport,
    badge: READINESS_EXPORT_BADGES.readinessOnly,
    title: READINESS_EXPORT_LABELS.wizardReadinessExport,
    metadata: {
      artifact_type: READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport,
      label: READINESS_EXPORT_LABELS.wizardReadinessExport,
      readiness_only: true,
      classification_status:
        READINESS_CLASSIFICATION_STATUSES.lockedEvidenceRequired,
      assessment_id: "assessment-1",
      generated_by: "user-1",
      generated_at: "2026-08-02T00:00:00.000Z",
      version: 1,
      wizard_profile_version: 3,
    },
    preview: "Readiness preparation gaps.",
    missing_evidence: [],
    unresolved_unknown_items: [
      {
        question_id: "humanReview",
        label: "Human review requires verification",
        answer_state: ANSWER_STATES.explicitUnknown,
      },
    ],
    preparation_guidance: ["Connect repository evidence before continuing."],
    next_steps: ["Run the evidence workflow."],
  };
}
