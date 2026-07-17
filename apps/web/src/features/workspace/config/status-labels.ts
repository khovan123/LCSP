import {
  ASSESSMENT_STATUS_CODES,
  WIZARD_STATUS_CODES,
  type WizardStatusCode,
} from "@lcsp/contracts/assessment";
import type { MessageKey } from "@lcsp/i18n";

import type { AssessmentStatus } from "../types/workspace.types";

export const assessmentStatusLabelKeys = {
  [ASSESSMENT_STATUS_CODES.wizardInProgress]:
    "pages.workspace.statuses.WIZARD_IN_PROGRESS",
  [ASSESSMENT_STATUS_CODES.wizardSubmitted]:
    "pages.workspace.statuses.WIZARD_SUBMITTED",
  [ASSESSMENT_STATUS_CODES.evidenceRequired]:
    "pages.workspace.statuses.EVIDENCE_REQUIRED",
  [ASSESSMENT_STATUS_CODES.scanInProgress]:
    "pages.workspace.statuses.SCAN_IN_PROGRESS",
  [ASSESSMENT_STATUS_CODES.classificationLocked]:
    "pages.workspace.statuses.CLASSIFICATION_LOCKED",
  [ASSESSMENT_STATUS_CODES.readyForReview]:
    "pages.workspace.statuses.READY_FOR_REVIEW",
} as const satisfies Record<AssessmentStatus, MessageKey>;

export const wizardStatusLabelKeys = {
  [WIZARD_STATUS_CODES.notStarted]:
    "pages.workspace.wizardStatuses.NOT_STARTED",
  [WIZARD_STATUS_CODES.inProgress]:
    "pages.workspace.wizardStatuses.IN_PROGRESS",
  [WIZARD_STATUS_CODES.submitted]: "pages.workspace.wizardStatuses.SUBMITTED",
} as const satisfies Record<WizardStatusCode, MessageKey>;
