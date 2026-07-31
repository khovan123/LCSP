import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import type {
  DeveloperTaskContext,
  DeveloperTaskContextOutcome,
} from "../../features/developer-task/types/developer-task.types.ts";
import { DEVELOPER_TASK_SCOPE_TYPES } from "../../features/developer-task/types/developer-task.types.ts";
import { apiRequest } from "./api-request.ts";
import { API_OUTCOME_KINDS, API_REDIRECT_LOCATIONS } from "./outcome-kinds.ts";
import { getMfaRedirectLocation, getProblemCode } from "./problem-envelope.ts";

export async function getDeveloperTaskContext(): Promise<DeveloperTaskContextOutcome> {
  const { payload, ok, status, problemCode } = await apiRequest("/api/workspace/developer-task", {
    cache: "no-store",
  });

  return toDeveloperTaskContextOutcome(payload, ok, status, problemCode);
}

export function toDeveloperTaskContextOutcome(
  payload: unknown,
  ok: boolean,
  status: number,
  problemCode = getProblemCode(payload),
): DeveloperTaskContextOutcome {
  if (ok && isDeveloperTaskContext(payload)) {
    return {
      kind: API_OUTCOME_KINDS.loaded,
      context: {
        organization: payload.organization,
        scope: payload.scope,
        granted_actions: payload.granted_actions,
      },
    };
  }

  if (problemCode === AUTH_ERROR_CODES.mfaRequired) {
    return {
      kind: API_OUTCOME_KINDS.redirect,
      location: getMfaRedirectLocation(payload),
    };
  }
  if (status === 401 || problemCode === AUTH_ERROR_CODES.sessionInvalid) {
    return {
      kind: API_OUTCOME_KINDS.redirect,
      location: API_REDIRECT_LOCATIONS.signIn,
    };
  }
  if (status === 403 || problemCode === AUTH_ERROR_CODES.pbacDenied) {
    return { kind: API_OUTCOME_KINDS.accessRevoked };
  }

  return { kind: API_OUTCOME_KINDS.error };
}

function isDeveloperTaskContext(
  payload: unknown,
): payload is DeveloperTaskContext {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as DeveloperTaskContext;
  const scopeIsValid =
    candidate.scope?.type === DEVELOPER_TASK_SCOPE_TYPES.organization
      ? candidate.scope.assessment === null
      : candidate.scope?.type === DEVELOPER_TASK_SCOPE_TYPES.assessment &&
        typeof candidate.scope.assessment?.id === "string" &&
        typeof candidate.scope.assessment.name === "string";

  return (
    typeof candidate.organization?.id === "string" &&
    typeof candidate.organization.name === "string" &&
    scopeIsValid &&
    Array.isArray(candidate.granted_actions) &&
    candidate.granted_actions.every((action) => typeof action === "string")
  );
}
