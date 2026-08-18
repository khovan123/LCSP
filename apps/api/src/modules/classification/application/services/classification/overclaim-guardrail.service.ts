import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  ASSESSMENT_RESULT_MODES,
  ENGINEERING_RULE_EVALUATION_STATUSES,
  SCAN_ERROR_CODES,
} from "@lcsp/contracts/scan";
import { problemException } from "../../../../../platform/problems/problem-factory.js";

const PROHIBITED_OVERCLAIM_TERMS = [
  "certified",
  "validated",
  "approved",
  "production ready",
  "compliant",
  "non-compliant",
] as const;

const CANONICAL_ENGINEERING_STATUSES = new Set<string>(
  Object.values(ENGINEERING_RULE_EVALUATION_STATUSES),
);

interface NarrativeValue {
  path: string;
  text: string;
}

@Injectable()
export class OverclaimGuardrailService {
  private readonly logger = new Logger(OverclaimGuardrailService.name);

  validate(
    classificationData: Record<string, unknown>,
    correlationId: string,
  ): void {
    if (!classificationData || typeof classificationData !== "object") {
      return;
    }

    const narratives =
      classificationData.mode ===
      ASSESSMENT_RESULT_MODES.engineeringRuleEvaluation
        ? collectEngineeringAssessmentNarratives(classificationData)
        : collectNarrativeStrings(classificationData);

    for (const narrative of narratives) {
      const normalized = narrative.text.toLowerCase();
      for (const term of PROHIBITED_OVERCLAIM_TERMS) {
        if (normalized.includes(term.toLowerCase())) {
          // Do not log the narrative itself: it can contain user/repository-derived
          // content. Path + matched policy term is enough to diagnose the guard.
          this.logger.warn(
            `Classification overclaim rejected: path=${narrative.path} term=${term}`,
          );
          throw problemException(
            SCAN_ERROR_CODES.classificationOverclaim,
            correlationId,
            { status: HttpStatus.UNPROCESSABLE_ENTITY },
          );
        }
      }
    }
  }
}

/**
 * The direct EngineeringRule artifact is mostly structured identities, provenance,
 * enum statuses and evidence refs. Those values are not narrative claims and must
 * not be scanned for English policy substrings (for example an approved legal-source
 * locator containing "approved"). Only fields that can communicate a human/model
 * conclusion are inspected.
 */
function collectEngineeringAssessmentNarratives(
  value: Record<string, unknown>,
): NarrativeValue[] {
  const result: NarrativeValue[] = [];

  // Top-level notes are explicitly narrative. Keep them guarded while avoiding
  // recursive scans over structured IDs/provenance that caused false positives.
  collectNamedNarrative(value.notes, "notes", result);
  collectNamedNarrative(value.limitations, "limitations", result);

  if (Array.isArray(value.evaluations)) {
    value.evaluations.forEach((evaluation, index) => {
      if (!isRecord(evaluation)) return;
      collectNamedNarrative(
        evaluation.reason,
        `evaluations[${index}].reason`,
        result,
      );
      collectNamedNarrative(
        evaluation.limitations,
        `evaluations[${index}].limitations`,
        result,
      );
    });
  }

  if (Array.isArray(value.claims)) {
    value.claims.forEach((claim, index) => {
      if (!isRecord(claim)) return;
      // Native finish currently constrains value to boolean, but retain this
      // guard if a future schema permits a textual claim value.
      collectNamedNarrative(claim.value, `claims[${index}].value`, result);
      collectNamedNarrative(
        claim.limitations,
        `claims[${index}].limitations`,
        result,
      );
    });
  }

  return result;
}

function collectNamedNarrative(
  value: unknown,
  path: string,
  result: NarrativeValue[],
): void {
  if (typeof value === "string") {
    if (!CANONICAL_ENGINEERING_STATUSES.has(value.trim().toUpperCase())) {
      result.push({ path, text: value });
    }
    return;
  }
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (typeof item === "string") {
      if (!CANONICAL_ENGINEERING_STATUSES.has(item.trim().toUpperCase())) {
        result.push({ path: `${path}[${index}]`, text: item });
      }
    }
  });
}

function collectNarrativeStrings(value: unknown, path = "$"): NarrativeValue[] {
  if (typeof value === "string") {
    return CANONICAL_ENGINEERING_STATUSES.has(value.trim().toUpperCase())
      ? []
      : [{ path, text: value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectNarrativeStrings(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, item]) => collectNarrativeStrings(item, `${path}.${key}`),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
