import { Injectable } from "@nestjs/common";
import {
  ANSWER_STATES,
  READINESS_UNKNOWN_QUESTIONS,
  WIZARD_UNKNOWN_SENTINELS,
  type ReadinessUnresolvedUnknownItem,
  type WizardAnswer,
} from "@lcsp/contracts/wizard";
import {
  ASSESSMENT_LOCK_REASONS,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import type { MissingEvidenceItem } from "../../contracts/wizard/readiness.contract.js";

export interface ReadinessEvaluationInput {
  hasRepositoryConnection: boolean;
  hasAcceptedTechnicalEvidence: boolean;
  wizardStatus: string | null;
  wizardAnswers?: WizardAnswer[];
}

export interface ReadinessEvaluationResult {
  classification_locked: boolean;
  lock_reason: string | null;
  missing_evidence: MissingEvidenceItem[];
  unresolved_unknown_items: ReadinessUnresolvedUnknownItem[];
  completed_steps: string[];
  next_action: string;
}

@Injectable()
export class ReadinessEvaluatorService {
  evaluate(input: ReadinessEvaluationInput): ReadinessEvaluationResult {
    const classificationLocked = !input.hasAcceptedTechnicalEvidence;
    const lockReason = classificationLocked
      ? ASSESSMENT_LOCK_REASONS.evidenceRequired
      : null;

    const missingEvidence: MissingEvidenceItem[] = [];
    const completedSteps: string[] = [];

    // 1. Wizard Status
    if (input.wizardStatus === WIZARD_STATUS_CODES.submitted) {
      completedSteps.push("wizard_profile");
    }

    // 2. Repository Connection
    if (input.hasRepositoryConnection) {
      completedSteps.push("repository_connected");
    } else {
      missingEvidence.push({
        type: "repository_connection",
        label: "Repository Connection",
        description:
          "A version control repository must be connected to analyze the codebase.",
      });
    }

    // 3. Technical Evidence
    if (input.hasAcceptedTechnicalEvidence) {
      completedSteps.push("technical_evidence_accepted");
    } else {
      missingEvidence.push({
        type: "technical_evidence",
        label: "Technical Evidence",
        description:
          "The repository must be successfully scanned to generate technical evidence.",
      });
    }

    // 4. Next Action logic (Business language only)
    let nextAction = "System is ready for classification.";

    if (!input.hasRepositoryConnection) {
      nextAction = "Connect a code repository to begin analysis.";
    } else if (!input.hasAcceptedTechnicalEvidence) {
      nextAction =
        "Wait for the repository scan to complete and generate technical evidence.";
    } else if (input.wizardStatus !== WIZARD_STATUS_CODES.submitted) {
      nextAction =
        "Complete and submit the Assessment Wizard to provide business context.";
    }

    return {
      classification_locked: classificationLocked,
      lock_reason: lockReason,
      missing_evidence: missingEvidence,
      unresolved_unknown_items: this.projectUnknowns(input.wizardAnswers ?? []),
      completed_steps: completedSteps,
      next_action: nextAction,
    };
  }

  private projectUnknowns(
    answers: WizardAnswer[],
  ): ReadinessUnresolvedUnknownItem[] {
    return Object.values(READINESS_UNKNOWN_QUESTIONS).flatMap((question) => {
      const answer = answers.find(
        (candidate) => candidate.questionId === question.questionId,
      );
      if (!answer || !this.isUnknown(answer)) return [];

      return [
        {
          question_id: question.questionId,
          label: question.label,
          answer_state: ANSWER_STATES.explicitUnknown,
        },
      ];
    });
  }

  private isUnknown(answer: WizardAnswer): boolean {
    return (
      answer.answerState === ANSWER_STATES.explicitUnknown ||
      this.containsUnknownSentinel(answer.value)
    );
  }

  private containsUnknownSentinel(value: unknown): boolean {
    if (typeof value === "string") {
      const normalized = value.trim().toUpperCase();
      return Object.values(WIZARD_UNKNOWN_SENTINELS).some(
        (sentinel) => sentinel === normalized,
      );
    }
    return Array.isArray(value)
      ? value.some((item) => this.containsUnknownSentinel(item))
      : false;
  }
}
