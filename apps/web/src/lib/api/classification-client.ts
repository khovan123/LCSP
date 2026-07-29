import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import type { MessageKey } from "@lcsp/i18n";

import { PUBLIC_ENTRY_ROUTES } from "../../auth-entry.ts";

export type ClassificationStatusState = "locked" | "processing" | "passed" | "degraded" | "blocked";

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
};

type ClassificationStatusOutcome =
  | { kind: "loaded"; data: ClassificationStatusViewModel }
  | { kind: "redirect"; location: string }
  | { kind: "error"; titleKey: MessageKey; detailKey: MessageKey };

export function getClassificationActionVisibility(
  viewModel: Pick<ClassificationStatusViewModel, "state" | "hasClassification">,
): ClassificationActionVisibility {
  return {
    showFinalReport: viewModel.state === "passed",
    showGapAnalysis: viewModel.hasClassification,
  };
}

export async function getClassificationStatus(
  assessmentId: string,
): Promise<ClassificationStatusOutcome> {
  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}`,
    {
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => null);
  return toClassificationStatusOutcome(payload, response.ok, response.status);
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

  return {
    assessment_id:
      typeof candidate.assessment_id === "string"
        ? candidate.assessment_id
        : undefined,
    name: typeof candidate.name === "string" ? candidate.name : undefined,
    wizard_status:
      typeof candidate.wizard_status === "string"
        ? candidate.wizard_status
        : undefined,
    readiness_state:
      readiness === undefined
        ? undefined
        : { classification_locked: locked },
    guardrail_status: guardrailStatus as string | null | undefined,
  };
}

export function toClassificationStatusOutcome(
  payload: unknown,
  ok: boolean,
  status?: number,
): ClassificationStatusOutcome {
  if (ok && isAssessmentDetailPayload(payload)) {
    const viewModel = toClassificationStatusViewModel(payload);
    return { kind: "loaded", data: viewModel };
  }

  const code = getProblemCode(payload);
  if (
    status === 401 ||
    code === AUTH_ERROR_CODES.authRequired ||
    code === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return { kind: "redirect", location: PUBLIC_ENTRY_ROUTES.signIn };
  }

  return {
    kind: "error",
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
    state: "processing",
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

function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const problem = payload as { problem?: { code?: string; error_code?: string }; code?: string; error_code?: string };
  return problem.problem?.code ?? problem.problem?.error_code ?? problem.code ?? problem.error_code;
}
