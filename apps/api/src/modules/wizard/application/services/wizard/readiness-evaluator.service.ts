import { Injectable } from "@nestjs/common";
import {
  ASSESSMENT_LOCK_REASONS,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import type {
  MissingEvidenceItem,
  UnresolvedUnknownItem,
} from "../../contracts/wizard/readiness.contract.js";
import { ANSWER_STATES, type WizardAnswer } from "@lcsp/contracts/wizard";

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
  unresolved_unknown_items: UnresolvedUnknownItem[];
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
    const unresolvedUnknowns: UnresolvedUnknownItem[] = [];
    const completedSteps: string[] = [];

    // Extract EXPLICIT_UNKNOWN fields
    if (input.wizardAnswers) {
      const CRITICAL_FIELDS: Record<string, string> = {
        affectedSubjects: "affectedSubjects",
        dataTypes: "dataTypes",
        specialCategoryData: "specialCategoryData",
        biometricData: "biometricData",
        humanReview: "humanReview",
        externalLlmUsage: "externalLlmUsage",
        highImpactIndicators: "highImpactIndicators",
        prohibitedRiskSignals: "prohibitedRiskSignals",
      };

      for (const answer of input.wizardAnswers) {
        if (
          answer.answerState === ANSWER_STATES.explicitUnknown &&
          answer.questionId in CRITICAL_FIELDS
        ) {
          unresolvedUnknowns.push({
            questionId: answer.questionId,
            label: CRITICAL_FIELDS[answer.questionId]!,
            answerState: "EXPLICIT_UNKNOWN",
          });
        }
      }
    }

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
      unresolved_unknown_items: unresolvedUnknowns,
      completed_steps: completedSteps,
      next_action: nextAction,
    };
  }
}
