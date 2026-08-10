import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import type { MessageKey } from "@lcsp/i18n";

import { PUBLIC_ENTRY_ROUTES } from "../../auth-entry.ts";
import { apiRequest } from "./api-request.ts";
import { getProblemCode } from "./problem-envelope.ts";

export const CLASSIFICATION_STATUS_STATES = {
  locked: "locked",
  processing: "processing",
  passed: "passed",
  degraded: "degraded",
  blocked: "blocked",
} as const;

const CLASSIFICATION_STATUS_OUTCOME_KINDS = {
  loaded: "loaded",
  redirect: "redirect",
  error: "error",
} as const;

export type ClassificationStatusState =
  (typeof CLASSIFICATION_STATUS_STATES)[keyof typeof CLASSIFICATION_STATUS_STATES];

export type ClassificationStatusViewModel = {
  state: ClassificationStatusState;
  titleKey: MessageKey;
  badgeKey: MessageKey;
  descriptionKey: MessageKey;
  summaryKey?: MessageKey;
  references?: string[];
  hasClassification: boolean;
};

export type ClassificationActionVisibility = {
  showFinalReport: boolean;
  showGapAnalysis: boolean;
  showRerunClassification: boolean;
};

type ClassificationStatusOutcome =
  | {
      kind: typeof CLASSIFICATION_STATUS_OUTCOME_KINDS.loaded;
      data: ClassificationStatusViewModel;
    }
  | { kind: typeof CLASSIFICATION_STATUS_OUTCOME_KINDS.redirect; location: string }
  | {
      kind: typeof CLASSIFICATION_STATUS_OUTCOME_KINDS.error;
      titleKey: MessageKey;
      detailKey: MessageKey;
    };

export function getClassificationActionVisibility(
  viewModel: Pick<ClassificationStatusViewModel, "state" | "hasClassification">,
): ClassificationActionVisibility {
  return {
    showFinalReport: viewModel.state === CLASSIFICATION_STATUS_STATES.passed,
    showGapAnalysis: viewModel.hasClassification,
    showRerunClassification:
      viewModel.state === CLASSIFICATION_STATUS_STATES.processing &&
      !viewModel.hasClassification,
  };
}

export async function rerunClassification(assessmentId: string): Promise<void> {
  const response = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/classification/rerun`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    },
  );

  if (!response.ok) {
    throw new Error(response.problemCode ?? "classification-rerun-failed");
  }
}

export async function getClassificationStatus(
  assessmentId: string,
): Promise<ClassificationStatusOutcome> {
  const { payload, ok, status, problemCode } = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}`,
    {
      cache: "no-store",
    },
  );

  return toClassificationStatusOutcome(payload, ok, status, problemCode);
}

export function sanitizeAssessmentDetailPayload(
  payload: unknown,
): AssessmentDetailPayload | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as {
    assessment_id?: unknown;
    name?: unknown;
    wizard_status?: unknown;
    readiness_state?: unknown;
    guardrail_status?: unknown;
  };

  const readiness = candidate.readiness_state;
  if (
    readiness !== undefined &&
    (typeof readiness !== "object" || readiness === null)
  ) {
    return null;
  }

  const locked = readiness === undefined
    ? undefined
    : (readiness as { classification_locked?: unknown }).classification_locked;

  if (locked !== undefined && typeof locked !== "boolean") {
    return null;
  }

  const guardrailStatus = candidate.guardrail_status;
  if (
    guardrailStatus !== undefined &&
    guardrailStatus !== null &&
    typeof guardrailStatus !== "string"
  ) {
    return null;
  }

  const sanitized: AssessmentDetailPayload = {};

  if (typeof candidate.assessment_id === "string") {
    sanitized.assessment_id = candidate.assessment_id;
  }

  if (typeof candidate.name === "string") {
    sanitized.name = candidate.name;
  }

  if (typeof candidate.wizard_status === "string") {
    sanitized.wizard_status = candidate.wizard_status;
  }

  if (readiness !== undefined) {
    sanitized.readiness_state = locked === undefined
      ? {}
      : { classification_locked: locked };
  }

  if (guardrailStatus !== undefined) {
    sanitized.guardrail_status = guardrailStatus as string | null;
  }

  return sanitized;
}

export function toClassificationStatusOutcome(
  payload: unknown,
  ok: boolean,
  status?: number,
  problemCode = getProblemCode(payload),
): ClassificationStatusOutcome {
  if (ok && isAssessmentDetailPayload(payload)) {
    const viewModel = toClassificationStatusViewModel(payload);
    return { kind: CLASSIFICATION_STATUS_OUTCOME_KINDS.loaded, data: viewModel };
  }

  if (
    status === 401 ||
    problemCode === AUTH_ERROR_CODES.authRequired ||
    problemCode === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return {
      kind: CLASSIFICATION_STATUS_OUTCOME_KINDS.redirect,
      location: PUBLIC_ENTRY_ROUTES.signIn,
    };
  }

  return {
    kind: CLASSIFICATION_STATUS_OUTCOME_KINDS.error,
    titleKey: "pages.classification.errorTitle",
    detailKey: "pages.classification.errorDetail",
  };
}

function toClassificationStatusViewModel(payload: AssessmentDetailPayload): ClassificationStatusViewModel {
  const locked = payload.readiness_state?.classification_locked === true;
  const guardrailStatus = payload.guardrail_status ?? null;

  if (locked) {
    return {
      state: "locked",
      titleKey: "pages.classification.states.lockedTitle",
      badgeKey: "pages.classification.states.lockedBadge",
      descriptionKey: "pages.classification.states.lockedDescription",
      hasClassification: false,
    };
  }

  if (guardrailStatus === "passed") {
    return {
      state: "passed",
      titleKey: "pages.classification.states.passedTitle",
      badgeKey: "pages.classification.states.passedBadge",
      descriptionKey: "pages.classification.states.passedDescription",
      summaryKey: "pages.classification.states.passedSummary",
      references: ["Article 1", "Article 2"],
      hasClassification: true,
    };
  }

  if (guardrailStatus === "degraded") {
    return {
      state: "degraded",
      titleKey: "pages.classification.states.degradedTitle",
      badgeKey: "pages.classification.states.degradedBadge",
      descriptionKey: "pages.classification.states.degradedDescription",
      summaryKey: "pages.classification.states.degradedSummary",
      hasClassification: true,
    };
  }

  if (guardrailStatus === "blocked") {
    return {
      state: "blocked",
      titleKey: "pages.classification.states.blockedTitle",
      badgeKey: "pages.classification.states.blockedBadge",
      descriptionKey: "pages.classification.states.blockedDescription",
      summaryKey: "pages.classification.states.blockedSummary",
      hasClassification: true,
    };
  }

  return {
    state: CLASSIFICATION_STATUS_STATES.processing,
    titleKey: "pages.classification.states.processingTitle",
    badgeKey: "pages.classification.states.processingBadge",
    descriptionKey: "pages.classification.states.processingDescription",
    hasClassification: false,
  };
}

type AssessmentDetailPayload = {
  assessment_id?: string;
  name?: string;
  wizard_status?: string;
  readiness_state?: {
    classification_locked?: boolean;
  };
  guardrail_status?: string | null;
};

function isAssessmentDetailPayload(payload: unknown): payload is AssessmentDetailPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as AssessmentDetailPayload;
  return typeof candidate.readiness_state?.classification_locked === "boolean" || "guardrail_status" in candidate;
}
