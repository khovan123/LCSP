import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import type { MessageKey } from "@lcsp/i18n";

import { PUBLIC_ENTRY_ROUTES } from "../../auth-entry.ts";
import { assessmentStatusLabelKeys } from "../../features/workspace/config/status-labels.ts";
import type {
  AssessmentStatus,
  AssessmentSummary,
  AssessmentsOutcome,
  WorkspaceContext,
  WorkspaceOutcome,
} from "../../features/workspace/types/workspace.types.ts";

export const WORKSPACE_ROUTES = Object.freeze({
  mfaVerify: "/mfa/verify",
});

const workspaceApiPaths = Object.freeze({
  workspace: "/workspace",
  assessments: "/assessments",
});

type ApiProblemPayload = {
  code?: string;
  error_code?: string;
  problem?: {
    code?: string;
    error_code?: string;
  };
};

type WorkspaceApiPayload = {
  organization_id: string;
  organization_name: string;
  subject_role: string;
  granted_actions: string[];
};

export function canCreateAssessment(grantedActions: readonly string[]) {
  return grantedActions.includes("assessment:create");
}

export function getAssessmentStatusLabelKey(
  status: AssessmentStatus,
): MessageKey {
  return assessmentStatusLabelKeys[status];
}

export async function getWorkspace(): Promise<WorkspaceOutcome> {
  const response = await fetch(workspaceApiPaths.workspace, {
    credentials: "same-origin",
  });
  const payload: unknown = await response.json().catch(() => null);

  return toWorkspaceOutcome(payload, response.ok, response.status);
}

export async function getAssessments(): Promise<AssessmentsOutcome> {
  const response = await fetch(workspaceApiPaths.assessments, {
    credentials: "same-origin",
  });
  const payload: unknown = await response.json().catch(() => null);

  return toAssessmentsOutcome(payload, response.ok);
}

export function toWorkspaceOutcome(
  payload: unknown,
  ok: boolean,
  status?: number,
): WorkspaceOutcome {
  if (ok && isWorkspaceContextPayload(payload)) {
    return { kind: "loaded", workspace: normalizeWorkspacePayload(payload) };
  }

  if (ok && isWorkspaceApiPayload(payload)) {
    return { kind: "loaded", workspace: normalizeWorkspaceApiPayload(payload) };
  }

  const code = getProblemCode(payload);
  if (
    status === 401 ||
    code === AUTH_ERROR_CODES.authRequired ||
    code === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return { kind: "redirect", location: PUBLIC_ENTRY_ROUTES.signIn };
  }

  if (code === AUTH_ERROR_CODES.mfaRequired) {
    return { kind: "redirect", location: WORKSPACE_ROUTES.mfaVerify };
  }

  return {
    kind: "error",
    titleKey: "pages.workspace.errors.workspaceUnavailableTitle",
    detailKey: "pages.workspace.errors.workspaceUnavailableDetail",
  };
}

export function toAssessmentsOutcome(
  payload: unknown,
  ok: boolean,
): AssessmentsOutcome {
  if (ok && isAssessmentsPayload(payload)) {
    return { kind: "loaded", assessments: payload.assessments };
  }

  return {
    kind: "error",
    titleKey: "pages.workspace.errors.assessmentsUnavailableTitle",
    detailKey: "pages.workspace.errors.assessmentsUnavailableDetail",
  };
}

function normalizeWorkspacePayload(
  payload: WorkspaceContext,
): WorkspaceContext {
  return {
    organization: payload.organization,
    membership: payload.membership,
    granted_actions: payload.granted_actions,
  };
}

function normalizeWorkspaceApiPayload(
  payload: WorkspaceApiPayload,
): WorkspaceContext {
  return {
    organization: {
      id: payload.organization_id,
      name: payload.organization_name,
    },
    membership: {
      role: payload.subject_role,
    },
    granted_actions: payload.granted_actions,
  };
}

function isWorkspaceContextPayload(
  payload: unknown,
): payload is WorkspaceContext {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as WorkspaceContext;
  return (
    typeof candidate.organization?.id === "string" &&
    typeof candidate.organization.name === "string" &&
    typeof candidate.membership?.role === "string" &&
    Array.isArray(candidate.granted_actions) &&
    candidate.granted_actions.every((action) => typeof action === "string")
  );
}

function isWorkspaceApiPayload(
  payload: unknown,
): payload is WorkspaceApiPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as WorkspaceApiPayload;
  return (
    typeof candidate.organization_id === "string" &&
    typeof candidate.organization_name === "string" &&
    typeof candidate.subject_role === "string" &&
    Array.isArray(candidate.granted_actions) &&
    candidate.granted_actions.every((action) => typeof action === "string")
  );
}

function isAssessmentsPayload(
  payload: unknown,
): payload is { assessments: AssessmentSummary[] } {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const assessments = (payload as { assessments?: unknown }).assessments;
  return (
    Array.isArray(assessments) &&
    assessments.every((assessment) => isAssessmentSummary(assessment))
  );
}

function isAssessmentSummary(payload: unknown): payload is AssessmentSummary {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as AssessmentSummary;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    isAssessmentStatus(candidate.status) &&
    isAssessmentStatus(candidate.wizard_status) &&
    typeof candidate.created_at === "string"
  );
}

function isAssessmentStatus(status: unknown): status is AssessmentStatus {
  return (
    typeof status === "string" &&
    Object.hasOwn(assessmentStatusLabelKeys, status)
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
