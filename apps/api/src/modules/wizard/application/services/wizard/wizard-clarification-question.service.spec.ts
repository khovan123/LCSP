import {
  ANSWER_STATES,
  WIZARD_CLARIFICATION_AGENT_TARGET_KINDS,
  WIZARD_CLARIFICATION_ASK_MODES,
  WIZARD_CLARIFICATION_SCOPES,
  WIZARD_FIELD_CONTROLS,
  type WizardAnswer,
} from "@lcsp/contracts/wizard";
import { WizardClarificationQuestionService } from "./wizard-clarification-question.service.js";

const UPDATED_AT = "2026-08-23T00:00:00.000Z";

function answer(questionId: string, value: unknown): WizardAnswer {
  return {
    questionId,
    value,
    answerState: ANSWER_STATES.answered,
    updatedAt: UPDATED_AT,
  };
}

describe("WizardClarificationQuestionService", () => {
  let service: WizardClarificationQuestionService;

  beforeEach(() => {
    service = new WizardClarificationQuestionService();
  });

  it("generates bounded field-routed questions from an empty wizard draft", () => {
    const result = service.generate(
      [],
      WIZARD_CLARIFICATION_ASK_MODES.wizardDraft,
      3,
    );

    expect(result.scope).toBe(WIZARD_CLARIFICATION_SCOPES.preScan);
    expect(result.questions).toHaveLength(3);
    expect(
      result.questions.map((question) => question.targetFieldName),
    ).toEqual(["businessProcess", "useCase", "primaryActors"]);
    expect(result.questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetKind: WIZARD_CLARIFICATION_AGENT_TARGET_KINDS.wizardField,
          answerControl: WIZARD_FIELD_CONTROLS.textarea,
          routingConfidence: 1,
          evidenceRefs: [],
        }),
      ]),
    );
  });

  it("skips strong text fields and asks select questions for missing bounded choices", () => {
    const result = service.generate(
      [
        answer(
          "businessProcess",
          "LCSP supports compliance teams assessing AI systems before production use.",
        ),
        answer(
          "useCase",
          "Compliance Manager creates an assessment, attaches a repository, runs a scan, and reviews evidence.",
        ),
        answer(
          "primaryActors",
          "Compliance Manager, Engineering Owner, Legal Operator, and LCSP worker services.",
        ),
        answer(
          "businessTrigger",
          "The flow starts when a Compliance Manager submits the intake wizard and triggers a repository scan.",
        ),
        answer(
          "expectedOutcome",
          "The flow produces a technical evidence report, guardrail status, and review-ready limitations.",
        ),
        answer(
          "aiPurpose",
          "AI helps plan investigation and summarize evidence against approved rules, without approving the final result.",
        ),
      ],
      WIZARD_CLARIFICATION_ASK_MODES.prePlanner,
      5,
    );

    expect(result.scope).toBe(WIZARD_CLARIFICATION_SCOPES.postGraph);
    expect(result.questions[0]).toEqual(
      expect.objectContaining({
        targetFieldName: "autonomyLevel",
        answerControl: WIZARD_FIELD_CONTROLS.select,
        optionSet: "autonomyLevel",
      }),
    );
  });
});
