import { HttpStatus, Injectable } from "@nestjs/common";
import {
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

@Injectable()
export class OverclaimGuardrailService {
  validate(
    classificationData: Record<string, unknown>,
    correlationId: string,
  ): void {
    if (!classificationData || typeof classificationData !== "object") {
      return;
    }

    for (const text of collectNarrativeStrings(classificationData)) {
      const normalized = text.toLowerCase();
      for (const term of PROHIBITED_OVERCLAIM_TERMS) {
        if (normalized.includes(term.toLowerCase())) {
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

function collectNarrativeStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return CANONICAL_ENGINEERING_STATUSES.has(value.trim().toUpperCase())
      ? []
      : [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectNarrativeStrings);
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value as Record<string, unknown>).flatMap(
    collectNarrativeStrings,
  );
}
