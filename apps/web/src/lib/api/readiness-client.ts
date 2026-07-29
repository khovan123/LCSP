import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { PUBLIC_ENTRY_ROUTES } from "../../auth-entry.ts";

export type ReadinessStatusViewModel = {
  classificationLocked: boolean;
  missingEvidence: Array<{
    type: string;
    label: string;
    description: string;
  }>;
  completedSteps: string[];
  nextAction: string;
  updatedAt: string;
};

type ReadinessStatusOutcome =
  | { kind: "loaded"; data: ReadinessStatusViewModel }
  | { kind: "redirect"; location: string }
  | { kind: "error"; titleKey: string; detailKey: string };

type ApiProblemPayload = {
  code?: string;
  error_code?: string;
  problem?: {
    code?: string;
    error_code?: string;
  };
};

type ReadinessPayload = {
  classification_locked?: unknown;
  missing_evidence?: unknown;
  completed_steps?: unknown;
  next_action?: unknown;
  updated_at?: unknown;
};

export async function getReadinessStatus(
  assessmentId: string,
): Promise<ReadinessStatusOutcome> {
  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}/readiness`,
    {
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  const payload: unknown = await response.json().catch(() => null);

  if (response.ok && isReadinessPayload(payload)) {
    return {
      kind: "loaded",
      data: {
        classificationLocked: payload.classification_locked,
        missingEvidence: payload.missing_evidence,
        completedSteps: payload.completed_steps,
        nextAction: payload.next_action,
        updatedAt: payload.updated_at,
      },
    };
  }

  const code = getProblemCode(payload);
  if (
    response.status === 401 ||
    code === AUTH_ERROR_CODES.authRequired ||
    code === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return { kind: "redirect", location: PUBLIC_ENTRY_ROUTES.signIn };
  }

  return {
    kind: "error",
    titleKey: "pages.readiness.errorTitle",
    detailKey: "pages.readiness.errorDetail",
  };
}

function isReadinessPayload(
  payload: unknown,
): payload is {
  classification_locked: boolean;
  missing_evidence: Array<{
    type: string;
    label: string;
    description: string;
  }>;
  completed_steps: string[];
  next_action: string;
  updated_at: string;
} {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as ReadinessPayload;
  return (
    typeof candidate.classification_locked === "boolean" &&
    Array.isArray(candidate.missing_evidence) &&
    candidate.missing_evidence.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { type?: unknown }).type === "string" &&
        typeof (item as { label?: unknown }).label === "string" &&
        typeof (item as { description?: unknown }).description === "string",
    ) &&
    Array.isArray(candidate.completed_steps) &&
    candidate.completed_steps.every((item) => typeof item === "string") &&
    typeof candidate.next_action === "string" &&
    typeof candidate.updated_at === "string"
  );
}

function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const problem = payload as ApiProblemPayload;
  return (
    problem.problem?.code ??
    problem.problem?.error_code ??
    problem.code ??
    problem.error_code
  );
}

