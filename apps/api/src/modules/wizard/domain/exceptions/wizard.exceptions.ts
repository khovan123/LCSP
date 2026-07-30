import { HttpException, HttpStatus } from "@nestjs/common";
import { ASSESSMENT_ERROR_CODES } from "@lcsp/contracts/assessment";
import { WIZARD_ERROR_CODES } from "@lcsp/contracts/wizard";

import { problemResult } from "../../../../platform/problems/problem-factory.js";

export class WizardAlreadySubmittedException extends HttpException {
  constructor(correlationId: string) {
    super(
      problemResult(WIZARD_ERROR_CODES.alreadySubmitted, correlationId, {
        status: HttpStatus.CONFLICT,
      }),
      HttpStatus.CONFLICT,
    );
  }
}

export class AssessmentNotFoundException extends HttpException {
  constructor(correlationId: string) {
    super(
      problemResult(ASSESSMENT_ERROR_CODES.notFound, correlationId, {
        status: HttpStatus.NOT_FOUND,
      }),
      HttpStatus.NOT_FOUND,
    );
  }
}
