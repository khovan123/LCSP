import { ReadinessEvaluatorService } from "./readiness-evaluator.service.js";
import { WIZARD_STATUS_CODES } from "@lcsp/contracts/assessment";

describe("ReadinessEvaluatorService", () => {
  let service: ReadinessEvaluatorService;

  beforeEach(() => {
    service = new ReadinessEvaluatorService();
  });

  it("T01: WizardProfile submitted, no evidence -> classification_locked = true, LOCKED_EVIDENCE_REQUIRED", () => {
    const result = service.evaluate({
      hasRepositoryConnection: true,
      hasAcceptedTechnicalEvidence: false,
      wizardStatus: WIZARD_STATUS_CODES.submitted,
    });

    expect(result.classification_locked).toBe(true);
    expect(result.lock_reason).toBe("LOCKED_EVIDENCE_REQUIRED");
    expect(result.missing_evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "technical_evidence" }),
      ]),
    );
    expect(result.completed_steps).toEqual(["wizard_profile", "repository_connected"]);
  });

  it("T02: WizardProfile submitted, evidence accepted -> classification_locked = false", () => {
    const result = service.evaluate({
      hasRepositoryConnection: true,
      hasAcceptedTechnicalEvidence: true,
      wizardStatus: WIZARD_STATUS_CODES.submitted,
    });

    expect(result.classification_locked).toBe(false);
    expect(result.lock_reason).toBeNull();
    expect(result.missing_evidence).toHaveLength(0);
    expect(result.completed_steps).toEqual([
      "wizard_profile",
      "repository_connected",
      "technical_evidence_accepted",
    ]);
  });

  it("T03: No repository connected -> missing_evidence includes repository_connection", () => {
    const result = service.evaluate({
      hasRepositoryConnection: false,
      hasAcceptedTechnicalEvidence: false,
      wizardStatus: WIZARD_STATUS_CODES.inProgress,
    });

    expect(result.classification_locked).toBe(true);
    expect(result.missing_evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "repository_connection" }),
      ]),
    );
  });

  it("T04: Repository connected, no evidence -> missing_evidence includes technical_evidence", () => {
    const result = service.evaluate({
      hasRepositoryConnection: true,
      hasAcceptedTechnicalEvidence: false,
      wizardStatus: WIZARD_STATUS_CODES.submitted,
    });

    expect(result.missing_evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "technical_evidence" }),
      ]),
    );
  });

  it("T05: Response has no risk labels when locked", () => {
    const result = service.evaluate({
      hasRepositoryConnection: false,
      hasAcceptedTechnicalEvidence: false,
      wizardStatus: WIZARD_STATUS_CODES.inProgress,
    });

    // Ensure no forbidden words are present in the reason or action
    const text = JSON.stringify(result).toLowerCase();
    expect(text).not.toContain("risk");
    expect(text).not.toContain("severity");
    expect(text).not.toContain("high");
    expect(text).not.toContain("low");
  });

  it("T06: next_action is business language", () => {
    const result = service.evaluate({
      hasRepositoryConnection: false,
      hasAcceptedTechnicalEvidence: false,
      wizardStatus: null,
    });

    expect(result.next_action).toBe("Connect a code repository to begin analysis.");
  });
});
