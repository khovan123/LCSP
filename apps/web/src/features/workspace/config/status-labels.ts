import type { MessageKey } from "@lcsp/i18n";

import type { AssessmentStatus } from "../types/workspace.types";

export const assessmentStatusLabelKeys = {
  WIZARD_IN_PROGRESS: "pages.workspace.statuses.WIZARD_IN_PROGRESS",
  WIZARD_SUBMITTED: "pages.workspace.statuses.WIZARD_SUBMITTED",
  EVIDENCE_REQUIRED: "pages.workspace.statuses.EVIDENCE_REQUIRED",
  SCAN_IN_PROGRESS: "pages.workspace.statuses.SCAN_IN_PROGRESS",
  CLASSIFICATION_LOCKED: "pages.workspace.statuses.CLASSIFICATION_LOCKED",
  READY_FOR_REVIEW: "pages.workspace.statuses.READY_FOR_REVIEW",
} as const satisfies Record<AssessmentStatus, MessageKey>;
