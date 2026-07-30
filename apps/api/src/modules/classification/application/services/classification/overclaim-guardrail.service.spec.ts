import { describe, expect, it } from "@jest/globals";
import { UnprocessableEntityException } from "@nestjs/common";
import { SCAN_ERROR_CODES } from "@lcsp/contracts/scan";

import { OverclaimGuardrailService } from "./overclaim-guardrail.service.js";

describe("OverclaimGuardrailService", () => {
  const service = new OverclaimGuardrailService();

  it("passes when no overclaim terms are present", () => {
    expect(() =>
      service.validate(
        {
          classification: "HIGH_RISK",
          risk_level: "level_3",
          notes: "Legal basis supported by Article 12",
        },
        "corr-test",
      ),
    ).not.toThrow();
  });

  it("throws CLASSIFICATION_OVERCLAIM when 'certified' is present", () => {
    try {
      service.validate(
        {
          classification: "HIGH_RISK",
          notes: "This AI model is certified by authority",
        },
        "corr-test",
      );
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      const res = (err as UnprocessableEntityException).getResponse() as {
        problem: { code: string };
      };
      expect(res.problem.code).toBe(SCAN_ERROR_CODES.classificationOverclaim);
    }
  });

  it("throws CLASSIFICATION_OVERCLAIM when 'production ready' is present", () => {
    try {
      service.validate(
        {
          system_status: "production ready",
        },
        "corr-test",
      );
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      const res = (err as UnprocessableEntityException).getResponse() as {
        problem: { code: string };
      };
      expect(res.problem.code).toBe(SCAN_ERROR_CODES.classificationOverclaim);
    }
  });

  it("throws CLASSIFICATION_OVERCLAIM when 'compliant' or 'non-compliant' is present", () => {
    try {
      service.validate(
        {
          result: "non-compliant",
        },
        "corr-test",
      );
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      const res = (err as UnprocessableEntityException).getResponse() as {
        problem: { code: string };
      };
      expect(res.problem.code).toBe(SCAN_ERROR_CODES.classificationOverclaim);
    }
  });
});
