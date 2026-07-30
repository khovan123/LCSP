import { HttpStatus, Injectable } from "@nestjs/common";
import { SCAN_ERROR_CODES } from "@lcsp/contracts/scan";
import { problemException } from "../../../../../platform/problems/problem-factory.js";

const PROHIBITED_OVERCLAIM_TERMS = [
  "certified",
  "validated",
  "approved",
  "production ready",
  "compliant",
  "non-compliant",
] as const;

@Injectable()
export class OverclaimGuardrailService {
  validate(
    classificationData: Record<string, unknown>,
    correlationId: string,
  ): void {
    if (!classificationData || typeof classificationData !== "object") {
      return;
    }

    const textPayload = JSON.stringify(classificationData).toLowerCase();

    for (const term of PROHIBITED_OVERCLAIM_TERMS) {
      if (textPayload.includes(term.toLowerCase())) {
        throw problemException(
          SCAN_ERROR_CODES.classificationOverclaim,
          correlationId,
          { status: HttpStatus.UNPROCESSABLE_ENTITY },
        );
      }
    }
  }
}
