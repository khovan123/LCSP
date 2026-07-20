import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import type {
  DeveloperTaskContext,
  DeveloperTaskContextOutcome,
} from "../../features/developer-task/types/developer-task.types.ts";

export async function getDeveloperTaskContext(): Promise<DeveloperTaskContextOutcome> {
  const response = await fetch("/api/workspace/developer-task", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);

  return toDeveloperTaskContextOutcome(payload, response.ok, response.status);
}

export function toDeveloperTaskContextOutcome(
  payload: unknown,
  ok: boolean,
  status: number,
): DeveloperTaskContextOutcome {
  if (ok && isDeveloperTaskContext(payload)) {
    return {
      kind: "loaded",
      context: {
        organization: payload.organization,
        scope: payload.scope,
        granted_actions: payload.granted_actions,
      },
    };
  }

  const code = getProblemCode(payload);
  if (code === AUTH_ERROR_CODES.mfaRequired) {
    return { kind: "redirect", location: "/mfa/verify" };
  }
  if (status === 401 || code === AUTH_ERROR_CODES.sessionInvalid) {
    return { kind: "redirect", location: "/sign-in" };
  }
  if (status === 403 || code === AUTH_ERROR_CODES.pbacDenied) {
    return { kind: "access_revoked" };
  }

  return { kind: "error" };
}

function isDeveloperTaskContext(
  payload: unknown,
): payload is DeveloperTaskContext {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as DeveloperTaskContext;
  const scopeIsValid =
    candidate.scope?.type === "organization"
      ? candidate.scope.assessment === null
      : candidate.scope?.type === "assessment" &&
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

function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const candidate = payload as {
    code?: string;
    error_code?: string;
    problem?: { code?: string; error_code?: string };
  };
  return (
    candidate.problem?.code ??
    candidate.problem?.error_code ??
    candidate.code ??
    candidate.error_code
  );
}
