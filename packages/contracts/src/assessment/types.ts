import type { ASSESSMENT_ERROR_CODES } from "./codes.ts";
import type { WIZARD_STATUS_CODES } from "./statuses.ts";

export type AssessmentErrorCode =
  (typeof ASSESSMENT_ERROR_CODES)[keyof typeof ASSESSMENT_ERROR_CODES];

export type WizardStatusCode =
  (typeof WIZARD_STATUS_CODES)[keyof typeof WIZARD_STATUS_CODES];
