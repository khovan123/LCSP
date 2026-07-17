export class WizardAlreadySubmittedException extends Error {
  constructor(message = 'Wizard has already been submitted and cannot be updated.') {
    super(message);
    this.name = 'WizardAlreadySubmittedException';
  }
}

export class AssessmentNotFoundException extends Error {
  constructor(message = 'Assessment not found or you do not have permission to access it.') {
    super(message);
    this.name = 'AssessmentNotFoundException';
  }
}
