import { ReadinessEvaluatorService } from "./readiness-evaluator.service.js";
import {
  ASSESSMENT_LOCK_REASONS,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import { ANSWER_STATES } from "@lcsp/contracts/wizard";

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
    expect(result.lock_reason).toBe(ASSESSMENT_LOCK_REASONS.evidenceRequired);
    expect(result.missing_evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "technical_evidence" }),
      ]),
    );
    expect(result.completed_steps).toEqual([
      "wizard_profile",
      "repository_connected",
    ]);
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

    expect(result.next_action).toBe(
      "Connect a code repository to begin analysis.",
    );
  });

  it("projects explicit unknown answers without exposing raw values", () => {
    const result = service.evaluate({
      hasRepositoryConnection: false,
      hasAcceptedTechnicalEvidence: false,
      wizardStatus: WIZARD_STATUS_CODES.submitted,
      wizardAnswers: [
        {
          questionId: "dataTypes",
          value: "raw-sensitive-value-must-not-leak",
          answerState: ANSWER_STATES.explicitUnknown,
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          questionId: "humanReview",
          value: "UNCLEAR",
          answerState: ANSWER_STATES.answered,
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.unresolved_unknown_items).toEqual([
      expect.objectContaining({
        question_id: "dataTypes",
        answer_state: ANSWER_STATES.explicitUnknown,
      }),
      expect.objectContaining({
        question_id: "humanReview",
        answer_state: ANSWER_STATES.explicitUnknown,
      }),
    ]);
    expect(JSON.stringify(result.unresolved_unknown_items)).not.toContain(
      "raw-sensitive-value-must-not-leak",
    );
  });
});
