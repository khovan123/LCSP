import { ConflictException, NotFoundException } from '@nestjs/common';

export class WizardAlreadySubmittedException extends ConflictException {
  constructor(
    message = "Wizard has already been submitted and cannot be updated.",
  ) {
    super({
      message,
      error_code: "WIZARD_ALREADY_SUBMITTED",
    });
  }
}

export class AssessmentNotFoundException extends NotFoundException {
  constructor(
    message = "Assessment not found or you do not have permission to access it.",
  ) {
    super({
      message,
      error_code: "ASSESSMENT_NOT_FOUND",
    });
  }
}
