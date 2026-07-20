import { ACCEPT_INVITATION_ERROR_CODES } from "@lcsp/contracts/auth";

import type { AcceptedInvitationScope } from "./invitation-routing.ts";

export type AcceptInvitationApiSuccess = {
  session_token: string;
  scope: AcceptedInvitationScope;
};

export function isAcceptInvitationApiSuccess(
  payload: unknown,
): payload is AcceptInvitationApiSuccess {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as AcceptInvitationApiSuccess;
  if (
    typeof candidate.session_token !== "string" ||
    candidate.session_token.trim().length === 0
  ) {
    return false;
  }
  return candidate.scope?.type === "organization"
    ? candidate.scope.assessment_id === null
    : candidate.scope?.type === "assessment" &&
        typeof candidate.scope.assessment_id === "string" &&
        candidate.scope.assessment_id.trim().length > 0;
}

export function safeAcceptInvitationErrorCode(payload: unknown): string {
  const code = getProblemCode(payload);
  return code === ACCEPT_INVITATION_ERROR_CODES.invitationInvalid ||
    code === ACCEPT_INVITATION_ERROR_CODES.emailAlreadyExists ||
    code === ACCEPT_INVITATION_ERROR_CODES.passwordTooShort
    ? code
    : "UPSTREAM_RESPONSE_INVALID";
}

export function safeInvitationPreviewErrorCode(payload: unknown): string {
  return getProblemCode(payload) ===
    ACCEPT_INVITATION_ERROR_CODES.invitationInvalid
    ? ACCEPT_INVITATION_ERROR_CODES.invitationInvalid
    : "UPSTREAM_RESPONSE_INVALID";
}

function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const candidate = payload as {
    code?: unknown;
    problem?: { code?: unknown };
  };
  const code = candidate.problem?.code ?? candidate.code;
  return typeof code === "string" ? code : undefined;
}
