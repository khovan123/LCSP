import { describe, expect, it } from "@jest/globals";

import { ReadinessExportGuardrailService } from "./readiness-export-guardrail.service.js";

describe("ReadinessExportGuardrailService", () => {
  it("allows readiness-only content", () => {
    const result = new ReadinessExportGuardrailService().check({
      label: "Wizard Readiness Export",
      badge: "READINESS_ONLY",
      preparation_guidance: ["Connect repository evidence before continuing."],
    });

    expect(result).toEqual({ passed: true, blockedReason: null });
  });

  it("blocks risk, legal conclusion, and certification overclaims", () => {
    const service = new ReadinessExportGuardrailService();

    expect(service.check({ title: "High risk classification result" })).toEqual(
      {
        passed: false,
        blockedReason: "READINESS_EXPORT_OVERCLAIM:high",
      },
    );
    expect(service.check({ body: "This is certified." }).passed).toBe(false);
    expect(service.check({ body: "Legal conclusion ready." }).passed).toBe(
      false,
    );
  });
});
